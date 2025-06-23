import { useState, useEffect } from 'react';
import db from '../firebase';
import { collection, onSnapshot, doc, runTransaction, DocumentData, QueryDocumentSnapshot, getDocs, writeBatch, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Participant } from './useParticipants';
import { logAction } from './useLogger';

export interface Table {
  id: string;
  name: string;
  tableNumber: number;
  seats: (string | null)[]; // participant.id 또는 null
  status?: 'open' | 'closed' | 'standby';
  borderColor?: string;
  position?: { x: number; y: number };
}

export interface BalancingResult {
  participantId: string;
  fromTableNumber: number;
  fromSeatIndex: number;
  toTableNumber: number;
  toSeatIndex: number;
}

const tablesCollection = collection(db, 'tables');

// Fisher-Yates shuffle algorithm
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const useTables = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [maxSeatsSetting, setMaxSeatsSetting] = useState<number>(9);

  useEffect(() => {
    const settingsDocRef = doc(db, 'tournaments', 'settings');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().maxSeatsPerTable) {
            setMaxSeatsSetting(docSnap.data().maxSeatsPerTable);
        }
    });

    const unsubscribeTables = onSnapshot(tablesCollection,
      (snapshot) => {
        const tablesData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as Table)).sort((a, b) => a.tableNumber - b.tableNumber);
        setTables(tablesData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
        unsubscribeSettings();
        unsubscribeTables();
    };
  }, []);

  const updateMaxSeatsSetting = async (newMaxSeats: number) => {
    if (newMaxSeats < 5 || newMaxSeats > 10) {
        console.error("Max seats must be between 5 and 10.");
        return;
    }
    const settingsDocRef = doc(db, 'tournaments', 'settings');
    try {
        await setDoc(settingsDocRef, { maxSeatsPerTable: newMaxSeats }, { merge: true });
        logAction('max_seats_updated', { newMaxSeats });
    } catch (e) {
        console.error("Error updating max seats setting:", e);
        setError(e as Error);
    }
  };
  
  const updateTableDetails = async (tableId: string, data: { name?: string; borderColor?: string }) => {
    const tableRef = doc(db, 'tables', tableId);
    try {
      await updateDoc(tableRef, data);
      logAction('table_details_updated', { tableId, ...data });
    } catch (e) {
      console.error("Error updating table details:", e);
      setError(e as Error);
      throw e;
    }
  };

  const updateTablePosition = async (tableId: string, position: { x: number; y: number }) => {
    const tableRef = doc(db, 'tables', tableId);
    try {
      await updateDoc(tableRef, { position });
    } catch (e) {
      console.error("Error updating table position:", e);
      setError(e as Error);
      throw e;
    }
  };

  const activateTable = async (tableId: string) => {
    const tableRef = doc(db, 'tables', tableId);
    try {
      await updateDoc(tableRef, { status: 'open' });
      logAction('table_activated', { tableId });
    } catch (e) {
      console.error("Error activating table:", e);
      setError(e as Error);
      throw e;
    }
  };

  const openNewTable = async () => {
    setLoading(true);
    try {
      const maxTableNumber = tables.reduce((max, table) => Math.max(max, table.tableNumber), 0);
      const newTable = {
        name: `T${maxTableNumber + 1}`,
        tableNumber: maxTableNumber + 1,
        seats: Array(maxSeatsSetting).fill(null),
        status: 'standby',
        position: { x: 10, y: 10 + (tables.length * 40) },
      };
      const docRef = await addDoc(tablesCollection, newTable);
      logAction('table_created_standby', { tableId: docRef.id, tableNumber: newTable.tableNumber, maxSeats: maxSeatsSetting });
    } catch (e) {
      console.error("Error opening new table:", e);
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  const closeTable = async (tableIdToClose: string): Promise<BalancingResult[]> => {
    setLoading(true);
    try {
      const balancingResult: BalancingResult[] = [];
      const movedParticipantsDetails: any[] = [];

      await runTransaction(db, async (transaction) => {
        const tablesSnapshot = await getDocs(tablesCollection);
        const allTables: Table[] = tablesSnapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Table));

        const tableToClose = allTables.find(t => t.id === tableIdToClose);
        if (!tableToClose) {
          throw new Error(`Table with id ${tableIdToClose} not found.`);
        }

        const participantsToMove = (tableToClose.seats || [])
            .map((pId, index) => ({ pId, fromSeatIndex: index}))
            .filter(item => item.pId !== null) as { pId: string, fromSeatIndex: number }[];

        if (participantsToMove.length === 0) {
            const tableRef = doc(db, 'tables', tableIdToClose);
            transaction.delete(tableRef);
            logAction('table_closed', { tableId: tableIdToClose, tableNumber: tableToClose.tableNumber, movedParticipantsCount: 0 });
            return;
        }

        const openTables = allTables.filter(t => t.id !== tableIdToClose && t.status === 'open');
        if (openTables.length === 0) {
            throw new Error("참가자를 이동시킬 수 있는 활성화된 테이블이 없습니다.");
        }
        
        const mutableOpenTables = openTables.map(t => ({
          ...t,
          seats: [...(t.seats || Array(maxSeatsSetting).fill(null))],
          playerCount: (t.seats || []).filter(s => s !== null).length,
        }));

        for (const participantToMove of participantsToMove) {
          const minPlayerCount = Math.min(...mutableOpenTables.map(t => t.playerCount));
          const leastPopulatedTables = mutableOpenTables.filter(t => t.playerCount === minPlayerCount);
          
          let targetTable = leastPopulatedTables[Math.floor(Math.random() * leastPopulatedTables.length)];
          let emptySeatIndexes = targetTable.seats.map((seat, index) => (seat === null ? index : -1)).filter(index => index !== -1);

          if (emptySeatIndexes.length === 0) {
             const alternativeTables = mutableOpenTables.filter(t => t.id !== targetTable.id && t.seats.some(s => s === null));
             if(alternativeTables.length === 0) throw new Error(`Balancing failed: No seats available.`);
             
             targetTable = alternativeTables[Math.floor(Math.random() * alternativeTables.length)];
             emptySeatIndexes = targetTable.seats.map((s, i) => s === null ? i : -1).filter(i => i !== -1);
          }
          
          const targetSeatIndex = emptySeatIndexes[Math.floor(Math.random() * emptySeatIndexes.length)];
          
          targetTable.seats[targetSeatIndex] = participantToMove.pId;
          targetTable.playerCount++;
          
          const from = { tableNumber: tableToClose.tableNumber, seatIndex: participantToMove.fromSeatIndex };
          const to = { tableNumber: targetTable.tableNumber, seatIndex: targetSeatIndex };
          
          balancingResult.push({ participantId: participantToMove.pId, fromTableNumber: from.tableNumber, fromSeatIndex: from.seatIndex, toTableNumber: to.tableNumber, toSeatIndex: to.seatIndex });
          movedParticipantsDetails.push({ participantId: participantToMove.pId, from: `${from.tableNumber}-${from.seatIndex+1}`, to: `${to.tableNumber}-${to.seatIndex+1}` });
        }
        
        mutableOpenTables.forEach(t => {
            const tableRef = doc(db, 'tables', t.id);
            transaction.update(tableRef, { seats: t.seats });
        });

        const closedTableRef = doc(db, 'tables', tableIdToClose);
        transaction.delete(closedTableRef);
        
        logAction('table_closed', { 
            tableId: tableIdToClose, 
            tableNumber: tableToClose.tableNumber,
            movedParticipantsCount: participantsToMove.length
        });
        logAction('participants_moved', {
            details: movedParticipantsDetails
        });
      });

      return balancingResult;
    } catch (e) {
      console.error("Error closing table:", e);
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };
  
  const autoAssignSeats = async (participants: Participant[]) => {
    if (participants.length === 0) {
        alert("배정할 참가자가 없습니다.");
        return;
    }
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const tablesSnapshot = await getDocs(tablesCollection);
      
      const openTables: Table[] = tablesSnapshot.docs
        .map(d => ({id: d.id, ...d.data()} as Table))
        .filter(t => t.status === 'open');

      if (openTables.length === 0) {
        throw new Error("좌석을 배정할 수 있는 활성화된 테이블이 없습니다.");
      }

      const totalSeats = openTables.reduce((sum, table) => sum + (table.seats?.length || maxSeatsSetting), 0);
      if (participants.length > totalSeats) {
        throw new Error(`참가자 수(${participants.length})가 전체 좌석 수(${totalSeats})보다 많아 배정할 수 없습니다.`);
      }

      const shuffledParticipants = shuffleArray(participants);
      const tablePlayerGroups: { [key: string]: Participant[] } = {};
      openTables.forEach(table => {
        tablePlayerGroups[table.id] = [];
      });

      shuffledParticipants.forEach((participant, index) => {
        const tableIndex = index % openTables.length;
        const targetTableId = openTables[tableIndex].id;
        tablePlayerGroups[targetTableId].push(participant);
      });

      const newTableSeatArrays: { [key: string]: (string | null)[] } = {};
      for (const table of openTables) {
        const playersForThisTable = tablePlayerGroups[table.id];
        const seatCount = table.seats?.length || maxSeatsSetting;
        const newSeats: (string | null)[] = Array(seatCount).fill(null);
        
        const seatIndexes = Array.from({ length: seatCount }, (_, i) => i);
        const shuffledSeatIndexes = shuffleArray(seatIndexes);

        playersForThisTable.forEach((player, index) => {
          const seatIndex = shuffledSeatIndexes[index];
          newSeats[seatIndex] = player.id;
        });
        
        newTableSeatArrays[table.id] = newSeats;
      }

      for (const tableId in newTableSeatArrays) {
          const tableRef = doc(db, 'tables', tableId);
          batch.update(tableRef, { seats: newTableSeatArrays[tableId] });
      }
      
      await batch.commit();
      console.log("좌석 밸런싱 재배정이 성공적으로 완료되었습니다.");
      logAction('seats_reassigned_with_balancing', { participantsCount: participants.length, tableCount: openTables.length });
    } catch (e) {
      console.error("좌석 자동 재배정 중 오류가 발생했습니다:", e);
      alert(`오류 발생: ${e instanceof Error ? e.message : String(e)}`);
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const moveSeat = async (
    participantId: string,
    from: { tableId: string; seatIndex: number },
    to: { tableId: string; seatIndex: number }
  ) => {
    if (from.tableId === to.tableId && from.seatIndex === to.seatIndex) return;

    try {
        await runTransaction(db, async (transaction) => {
            const fromTableRef = doc(db, 'tables', from.tableId);
            const toTableRef = doc(db, 'tables', to.tableId);

            const [fromTableSnap, toTableSnap] = await Promise.all([
                transaction.get(fromTableRef),
                transaction.get(toTableRef)
            ]);

            if (!fromTableSnap.exists() || !toTableSnap.exists()) {
                throw new Error("테이블 정보를 찾을 수 없습니다.");
            }
            
            const fromSeats = [...fromTableSnap.data().seats];
            const toSeats = from.tableId === to.tableId ? fromSeats : [...toTableSnap.data().seats];
            
            if (toSeats[to.seatIndex] !== null) {
              const otherParticipantId = toSeats[to.seatIndex];
              fromSeats[from.seatIndex] = otherParticipantId;
              toSeats[to.seatIndex] = participantId;
            } else {
              fromSeats[from.seatIndex] = null;
              toSeats[to.seatIndex] = participantId;
            }

            transaction.update(fromTableRef, { seats: fromSeats });
            if (from.tableId !== to.tableId) {
                transaction.update(toTableRef, { seats: toSeats });
            }
        });
    } catch (e) {
        console.error("좌석 이동 중 오류 발생:", e);
        setError(e as Error);
    }
  };

  const bustOutParticipant = async (participantId: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const participantRef = doc(db, 'participants', participantId);
        transaction.update(participantRef, { status: 'busted' });

        const table = tables.find(t => (t.seats || []).includes(participantId));
        if (table) {
          const tableRef = doc(db, 'tables', table.id);
          const newSeats = (table.seats || []).map(seat => seat === participantId ? null : seat);
          transaction.update(tableRef, { seats: newSeats });
        }
      });
      logAction('participant_busted', { participantId });
    } catch (e) {
      console.error("탈락 처리 중 오류 발생:", e);
      setError(e as Error);
    }
  };

  return { tables, setTables, loading, error, maxSeatsSetting, updateMaxSeatsSetting, updateTableDetails, openNewTable, activateTable, closeTable, autoAssignSeats, moveSeat, bustOutParticipant, updateTablePosition };
};
