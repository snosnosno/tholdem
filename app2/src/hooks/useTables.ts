import { useState, useEffect } from 'react';
import db from '../firebase';
import { collection, onSnapshot, doc, runTransaction, DocumentData, QueryDocumentSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { Participant } from './useParticipants';
import { logAction } from './useLogger';

export interface Table {
  id: string;
  tableNumber: number;
  seats: (string | null)[]; // participant.id 또는 null
  status?: 'open' | 'closed';
}

export interface BalancingResult {
  participantId: string;
  fromTableNumber: number;
  toTableNumber: number;
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

        const participantsToMove = (tableToClose.seats || []).filter(pId => pId !== null) as string[];
        if (participantsToMove.length === 0) {
            // 닫을 테이블에 참가자가 없으면 테이블만 삭제하고 종료
            const tableRef = doc(db, 'tables', tableIdToClose);
            transaction.delete(tableRef);
            return;
        }

        const availableSeats: { tableId: string, tableNumber: number, seatIndex: number }[] = [];
        openTables.forEach(t => {
          (t.seats || []).forEach((pId, i) => {
            if (pId === null) {
              availableSeats.push({ tableId: t.id, tableNumber: t.tableNumber, seatIndex: i });
            }
          });
        });

        if (availableSeats.length < participantsToMove.length) {
          throw new Error("Not enough available seats to balance the table.");
        }

        const movedParticipantsDetails: any[] = [];

        participantsToMove.forEach((pId, i) => {
          const seat = availableSeats[i];
          const fromTableNumber = tableToClose.tableNumber;
          const toTableNumber = seat.tableNumber;
          
          balancingResult.push({ participantId: pId, fromTableNumber, toTableNumber });

          const targetTable = openTables.find(t => t.id === seat.tableId);
          if (targetTable) {
              const newSeats = [...(targetTable.seats || [])];
              newSeats[seat.seatIndex] = pId;
              targetTable.seats = newSeats; // 메모리상의 테이블 정보 업데이트

              movedParticipantsDetails.push({
                  participantId: pId,
                  from: `Table ${fromTableNumber}`,
                  to: `Table ${toTableNumber} (Seat ${seat.seatIndex + 1})`
              });
          }
        });
        
        // 트랜잭션 업데이트
        openTables.forEach(t => {
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
        }

        for (const tableId in newTableSeats) {
            const tableRef = doc(db, 'tables', tableId);
            transaction.update(tableRef, { seats: newTableSeats[tableId] });
        }
      });
      console.log("좌석 배정이 성공적으로 완료되었습니다.");
    } catch (e) {
      console.error("좌석 배정 중 오류가 발생했습니다:", e);
      setError(e as Error);
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


  return { tables, loading, error, autoAssignSeats, moveSeat, bustOutParticipant, closeTable };
};
