import { useState, useEffect } from 'react';
import db from '../firebase';
import { collection, onSnapshot, doc, runTransaction, DocumentData, QueryDocumentSnapshot, getDocs, writeBatch, addDoc, updateDoc } from 'firebase/firestore';
import { Participant } from './useParticipants';
import { logAction } from './useLogger';

export interface Table {
  id: string;
  name: string;
  tableNumber: number;
  seats: (string | null)[]; // participant.id 또는 null
  status?: 'open' | 'closed';
  borderColor?: string;
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

  useEffect(() => {
    const unsubscribe = onSnapshot(tablesCollection,
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

    return () => unsubscribe();
  }, []);
  
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

  const openNewTable = async () => {
    setLoading(true);
    try {
      const maxTableNumber = tables.reduce((max, table) => Math.max(max, table.tableNumber), 0);
      const newTable = {
        name: `Table ${maxTableNumber + 1}`,
        tableNumber: maxTableNumber + 1,
        seats: Array(9).fill(null),
        status: 'open',
      };
      const docRef = await addDoc(tablesCollection, newTable);
      logAction('table_opened', { tableId: docRef.id, tableNumber: newTable.tableNumber });
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

      await runTransaction(db, async (transaction) => {
        const tablesSnapshot = await getDocs(tablesCollection);
        const allTables: Table[] = tablesSnapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Table))
          .sort((a, b) => a.tableNumber - b.tableNumber);

        const tableToClose = allTables.find(t => t.id === tableIdToClose);
        const openTables = allTables.filter(t => t.id !== tableIdToClose && t.status !== 'closed');

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
        
        // 지능형 밸런싱 로직 시작
        const totalPlayers = openTables.reduce((sum, t) => sum + (t.seats || []).filter(s => s).length, 0) + participantsToMove.length;
        const totalTables = openTables.length;
        const basePlayersPerTable = Math.floor(totalPlayers / totalTables);
        let remainder = totalPlayers % totalTables;

        const tablesWithSeats = openTables.map(t => ({
            ...t,
            currentPlayerCount: (t.seats || []).filter(s => s).length,
            targetPlayerCount: basePlayersPerTable + (remainder-- > 0 ? 1 : 0),
        })).sort((a,b) => a.currentPlayerCount - b.currentPlayerCount);

        const movedParticipantsDetails: any[] = [];
        let participantIndex = 0;

        for (const table of tablesWithSeats) {
            const seatsToFill = table.targetPlayerCount - table.currentPlayerCount;
            for (let i = 0; i < seatsToFill; i++) {
                if(participantIndex >= participantsToMove.length) break;

                const participantToMove = participantsToMove[participantIndex];
                const emptySeatIndex = (table.seats || []).indexOf(null);
                
                if(emptySeatIndex !== -1) {
                    const from = { tableNumber: tableToClose.tableNumber, seatIndex: participantToMove.fromSeatIndex };
                    const to = { tableNumber: table.tableNumber, seatIndex: emptySeatIndex };

                    balancingResult.push({ participantId: participantToMove.pId, fromTableNumber: from.tableNumber, fromSeatIndex: from.seatIndex, toTableNumber: to.tableNumber, toSeatIndex: to.seatIndex });
                    
                    const newSeats = [...(table.seats || [])];
                    newSeats[emptySeatIndex] = participantToMove.pId;
                    table.seats = newSeats;

                    movedParticipantsDetails.push({
                        participantId: participantToMove.pId,
                        from: `${from.tableNumber}-${from.seatIndex + 1}`,
                        to: `${to.tableNumber}-${to.seatIndex + 1}`,
                    });

                    participantIndex++;
                }
            }
        }
        
        if (participantIndex < participantsToMove.length) {
            throw new Error("Balancing failed. Not all participants could be seated.");
        }
        // 지능형 밸런싱 로직 종료

        // 트랜잭션 업데이트
        tablesWithSeats.forEach(t => {
            const tableRef = doc(db, 'tables', t.id);
            transaction.update(tableRef, { seats: t.seats });
        });

        const closedTableRef = doc(db, 'tables', tableIdToClose);
        transaction.delete(closedTableRef);
        
        // 로그 기록은 트랜잭션 성공 후
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
      await runTransaction(db, async (transaction) => {
        const tablesSnapshot = await getDocs(tablesCollection);
        const currentTables: Table[] = tablesSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Table)).sort((a, b) => a.tableNumber - b.tableNumber);

        const newTableSeats: { [key: string]: (string | null)[] } = {};
        currentTables.forEach(t => {
            const seatCount = t.seats?.length || 9;
            newTableSeats[t.id] = Array(seatCount).fill(null);
        });

        const shuffledParticipants = shuffleArray(participants);

        let participantIndex = 0;
        
        while (participantIndex < shuffledParticipants.length) {
            for (const table of currentTables) {
                if (participantIndex >= shuffledParticipants.length) break;
                const targetSeatIndex = (newTableSeats[table.id] || []).indexOf(null);
                if (targetSeatIndex !== -1) {
                    newTableSeats[table.id][targetSeatIndex] = shuffledParticipants[participantIndex].id;
                    participantIndex++;
                }
            }
        const autoAssignSeats = async (participants: Participant[]) => {
          if (participants.length === 0) {
              alert("배정할 참가자가 없습니다.");
              return;
          }
          setLoading(true);
          try {
            await runTransaction(db, async (transaction) => {
              const tablesSnapshot = await getDocs(tablesCollection);
              const currentTables: Table[] = tablesSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Table));
        
              const allEmptySeats = currentTables.flatMap(table => 
                  Array.from({ length: table.seats?.length || 9 }, (_, i) => i)
                      .filter(seatIndex => !(table.seats || [])[seatIndex])
                      .map(seatIndex => ({ tableId: table.id, seatIndex }))
              );
        
              const shuffledParticipants = shuffleArray(participants);
              const shuffledSeats = shuffleArray(allEmptySeats);
        
              if (shuffledParticipants.length > shuffledSeats.length) {
                throw new Error(`Not enough empty seats. ${shuffledParticipants.length} participants, ${shuffledSeats.length} seats.`);
              }
              
              const newTableSeatArrays: { [key: string]: (string | null)[] } = {};
              currentTables.forEach(t => {
                  newTableSeatArrays[t.id] = [...(t.seats || Array(9).fill(null))];
              });
        
              shuffledParticipants.forEach((participant, index) => {
                  const seat = shuffledSeats[index];
                  newTableSeatArrays[seat.tableId][seat.seatIndex] = participant.id;
              });
        
              for (const tableId in newTableSeatArrays) {
                  const tableRef = doc(db, 'tables', tableId);
                  transaction.update(tableRef, { seats: newTableSeatArrays[tableId] });
              }
            });
            console.log("좌석 배정이 성공적으로 완료되었습니다.");
            logAction('seats_auto_assigned', { participantsCount: participants.length });
          } catch (e) {
            console.error("좌석 배정 중 오류가 발생했습니다:", e);
            setError(e as Error);
            throw e; // re-throw for the component to catch
          } finally {
            setLoading(false);
          }
        };
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
        // 1. 참가자 상태를 'busted'로 변경
        const participantRef = doc(db, 'participants', participantId);
        transaction.update(participantRef, { status: 'busted' });

        // 2. 테이블에서 참가자 제거
        const table = tables.find(t => (t.seats || []).includes(participantId));
        if (table) {
          const tableRef = doc(db, 'tables', table.id);
          const newSeats = (table.seats || []).map(seat => seat === participantId ? null : seat);
          transaction.update(tableRef, { seats: newSeats });
        }
      });
    } catch (e) {
      console.error("탈락 처리 중 오류 발생:", e);
      setError(e as Error);
    }
  };


  return { tables, setTables, loading, error, autoAssignSeats, moveSeat, bustOutParticipant, closeTable, openNewTable, updateTableDetails };
};
