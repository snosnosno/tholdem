import { collection, onSnapshot, doc, runTransaction, DocumentData, QueryDocumentSnapshot, getDocs, writeBatch, addDoc, updateDoc } from 'firebase/firestore';
import { logger } from '../utils/logger';
import { toast } from '../utils/toast';
import { useState, useEffect, useCallback } from 'react';

import { db } from '../firebase';

import { logAction } from './useLogger';
import { Participant } from './useParticipants';

export interface Table {
  id: string;
  name: string;
  tableNumber: number;
  seats: (string | null)[];
  status?: 'open' | 'closed' | 'standby';
  borderColor?: string;
  position?: { x: number; y: number };
  assignedStaffId?: string | null;
  assignedDealerId?: string | null; // @deprecated - assignedStaffId 사용 권장. 하위 호환성을 위해 유지
}

export interface BalancingResult {
  participantId: string;
  fromTableNumber: number;
  fromSeatIndex: number;
  toTableNumber: number;
  toSeatIndex: number;
}

const tablesCollection = collection(db, 'tables');

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = newArray[i]!;
    newArray[i] = newArray[j]!;
    newArray[j] = temp;
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
  
  const updateTableDetails = useCallback(async (tableId: string, data: { name?: string; borderColor?: string }) => {
    const tableRef = doc(db, 'tables', tableId);
    try {
      await updateDoc(tableRef, data);
      logAction('table_details_updated', { tableId, ...data });
    } catch (e) {
      logger.error('Error updating table details:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
      setError(e as Error);
      throw e;
    }
  }, []);

  const updateTablePosition = useCallback(async (tableId: string, position: { x: number; y: number }) => {
    const tableRef = doc(db, 'tables', tableId);
    try {
      await updateDoc(tableRef, { position });
    } catch (e) {
      logger.error('Error updating table position:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
      setError(e as Error);
      throw e;
    }
  }, []);

  const updateTableOrder = useCallback(async (tables: Table[]) => {
    const batch = writeBatch(db);
    tables.forEach((table, index) => {
        const tableRef = doc(db, 'tables', table.id);
        batch.update(tableRef, { tableNumber: index });
    });
    try {
        await batch.commit();
        logAction('table_order_updated', { tableCount: tables.length });
    } catch (e) {
        logger.error('Error updating table order:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
        setError(e as Error);
        throw e;
    }
  }, []);

  const openNewTable = useCallback(async () => {
    setLoading(true);
    try {
      const maxTableNumber = tables.reduce((max, table) => Math.max(max, table.tableNumber), 0);
      const newTable = {
        name: `T${maxTableNumber + 1}`,
        tableNumber: maxTableNumber + 1,
        seats: Array(maxSeatsSetting).fill(null),
        status: 'standby' as const,
        position: { x: 10, y: 10 + (tables.length * 40) },
      };
      const docRef = await addDoc(tablesCollection, newTable);
      logAction('table_created_standby', { tableId: docRef.id, tableNumber: newTable.tableNumber, maxSeats: maxSeatsSetting });
    } catch (e) {
      logger.error('Error opening new table:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [tables, maxSeatsSetting]);

  const activateTable = useCallback(async (tableId: string) => {
    const tableRef = doc(db, 'tables', tableId);
    try {
      await updateDoc(tableRef, { status: 'open' });
      logAction('table_activated', { tableId });
    } catch (e) {
      logger.error('Error activating table:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
      setError(e as Error);
      throw e;
    }
  }, []);
  
  const closeTable = useCallback(async (tableIdToClose: string): Promise<BalancingResult[]> => {
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
          if (!targetTable) continue;
          let emptySeatIndexes = targetTable.seats.map((seat, index) => (seat === null ? index : -1)).filter(index => index !== -1);

          if (emptySeatIndexes.length === 0) {
             const alternativeTables = mutableOpenTables.filter(t => t.id !== targetTable?.id && t.seats.some(s => s === null));
             if(alternativeTables.length === 0) throw new Error(`Balancing failed: No seats available.`);
             
             targetTable = alternativeTables[Math.floor(Math.random() * alternativeTables.length)];
             if (!targetTable) continue;
             emptySeatIndexes = targetTable.seats.map((s, i) => s === null ? i : -1).filter(i => i !== -1);
          }
          
          const targetSeatIndex = emptySeatIndexes[Math.floor(Math.random() * emptySeatIndexes.length)];
          if (targetSeatIndex === undefined) continue;

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
      const errorContext = {
        failedAction: 'close_table',
        tableId: tableIdToClose,
        errorMessage: e instanceof Error ? e.message : String(e),
      };
      logAction('action_failed', errorContext);
      logger.error('Error closing table:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [maxSeatsSetting]);
  
  const rebalanceAndAssignAll = useCallback(async (participants: Participant[]) => {
    if (participants.length === 0) {
        toast.warning("배정할 참가자가 없습니다.");
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
        const targetTable = openTables[tableIndex];
        if (!targetTable) return;
        const targetTableId = targetTable.id;
        const playerGroup = tablePlayerGroups[targetTableId];
        if (playerGroup) {
          playerGroup.push(participant);
        }
      });

      const newTableSeatArrays: { [key: string]: (string | null)[] } = {};
      for (const table of openTables) {
        const playersForThisTable = tablePlayerGroups[table.id];
        const seatCount = table.seats?.length || maxSeatsSetting;
        const newSeats: (string | null)[] = Array(seatCount).fill(null);
        
        const seatIndexes = Array.from({ length: seatCount }, (_, i) => i);
        const shuffledSeatIndexes = shuffleArray(seatIndexes);

        playersForThisTable?.forEach((player, index) => {
          const seatIndex = shuffledSeatIndexes[index];
          if (seatIndex !== undefined) {
            newSeats[seatIndex] = player.id;
          }
        });
        
        newTableSeatArrays[table.id] = newSeats;
      }

      for (const tableId in newTableSeatArrays) {
          const tableRef = doc(db, 'tables', tableId);
          batch.update(tableRef, { seats: newTableSeatArrays[tableId] });
      }
      
      await batch.commit();

      logAction('seats_reassigned_with_balancing', { participantsCount: participants.length, tableCount: openTables.length });
    } catch (e) {
      const errorContext = {
        failedAction: 'rebalance_and_assign_all',
        participantsCount: participants.length,
        errorMessage: e instanceof Error ? e.message : String(e),
      };
      logAction('action_failed', errorContext);
      logger.error('좌석 자동 재배정 중 오류가 발생했습니다:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
      toast.error(`오류 발생: ${e instanceof Error ? e.message : String(e)}`);
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [maxSeatsSetting]);

  const moveSeat = useCallback(async (
    participantId: string,
    from: { tableId: string; seatIndex: number },
    to: { tableId: string; seatIndex: number }
  ) => {
    if (from.tableId === to.tableId && from.seatIndex === to.seatIndex) return;

    try {
        await runTransaction(db, async (transaction) => {
            if (from.tableId === to.tableId) {
                // Same table move
                const tableRef = doc(db, 'tables', from.tableId);
                const tableSnap = await transaction.get(tableRef);
                if (!tableSnap.exists()) throw new Error("Table not found.");
                
                const seats = [...tableSnap.data().seats];
                if (seats[to.seatIndex] !== null) {
                  // This case should be prevented by UI (canDrop in Seat.tsx)
                  // but as a safeguard:
                  throw new Error("Target seat is already occupied.");
                }
                
                seats[to.seatIndex] = participantId;
                seats[from.seatIndex] = null;
                
                transaction.update(tableRef, { seats });

            } else {
                // Different table move
                const fromTableRef = doc(db, 'tables', from.tableId);
                const toTableRef = doc(db, 'tables', to.tableId);

                const [fromTableSnap, toTableSnap] = await Promise.all([
                    transaction.get(fromTableRef),
                    transaction.get(toTableRef)
                ]);

                if (!fromTableSnap.exists() || !toTableSnap.exists()) {
                    throw new Error("Table information could not be found.");
                }
                
                const fromSeats = [...fromTableSnap.data().seats];
                const toSeats = [...toTableSnap.data().seats];

                if (toSeats[to.seatIndex] !== null) {
                  // This case should be prevented by UI (canDrop in Seat.tsx)
                  throw new Error("Target seat is already occupied.");
                }

                fromSeats[from.seatIndex] = null;
                toSeats[to.seatIndex] = participantId;
                
                transaction.update(fromTableRef, { seats: fromSeats });
                transaction.update(toTableRef, { seats: toSeats });
            }
        });
        const fromTable = tables.find(t=>t.id === from.tableId);
        const toTable = tables.find(t=>t.id === to.tableId);
        logAction('seat_moved', { participantId, from: `${fromTable?.tableNumber}-${from.seatIndex+1}`, to: `${toTable?.tableNumber}-${to.seatIndex+1}` });

    } catch (e) {
        logger.error('An error occurred while moving the seat:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
        setError(e as Error);
        throw e;
    }
  }, [tables]);

  const bustOutParticipant = useCallback(async (participantId: string) => {
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
      logger.error('탈락 처리 중 오류 발생:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
      setError(e as Error);
    }
  }, [tables]);

  const updateTableMaxSeats = useCallback(async (tableId: string, newMaxSeats: number, getParticipantName: (id: string) => string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const tableRef = doc(db, 'tables', tableId);
        const tableSnap = await transaction.get(tableRef);
        if (!tableSnap.exists()) {
          throw new Error("테이블을 찾을 수 없습니다.");
        }

        const table = tableSnap.data() as Table;
        const currentSeats = table.seats || [];
        const currentMaxSeats = currentSeats.length;

        if (newMaxSeats === currentMaxSeats) return;

        if (newMaxSeats < currentMaxSeats) {
          const seatsToRemove = currentSeats.slice(newMaxSeats);
          const occupiedSeatsToRemove = seatsToRemove.map((pId, i) => ({ pId, seatNum: newMaxSeats + i + 1 })).filter(s => s.pId !== null);

          if (occupiedSeatsToRemove.length > 0) {
            const playerInfo = occupiedSeatsToRemove.map(s => `${s.seatNum}번(${getParticipantName(s.pId!)})`).join(', ');
            throw new Error(`좌석 수를 줄이려면 먼저 다음 플레이어를 이동시켜야 합니다: ${playerInfo}`);
          }
        }

        const newSeats = Array(newMaxSeats).fill(null);
        for(let i=0; i < Math.min(currentMaxSeats, newMaxSeats); i++) {
          newSeats[i] = currentSeats[i];
        }

        transaction.update(tableRef, { seats: newSeats });
      });

      logAction('max_seats_updated', { tableId, newMaxSeats });
    } catch (e) {
      logger.error('최대 좌석 수 변경 중 오류 발생:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
      setError(e as Error);
      throw e; // Rethrow to be caught by the UI
    }
  }, []);

  const autoBalanceByChips = useCallback(async (participants: Participant[]) => {
    // 활성 참가자만 필터링
    const activeParticipants = participants.filter(p => p.status === 'active');
    if (activeParticipants.length === 0) {
      toast.warning("칩 균형 재배치할 활성 참가자가 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const tablesSnapshot = await getDocs(tablesCollection);

      const openTables: Table[] = tablesSnapshot.docs
        .map(d => ({id: d.id, ...d.data()} as Table))
        .filter(t => t.status === 'open')
        .sort((a, b) => a.tableNumber - b.tableNumber);

      if (openTables.length === 0) {
        throw new Error("칩 균형 재배치를 할 수 있는 활성화된 테이블이 없습니다.");
      }

      const totalSeats = openTables.reduce((sum, table) => sum + (table.seats?.length || maxSeatsSetting), 0);
      if (activeParticipants.length > totalSeats) {
        throw new Error(`활성 참가자 수(${activeParticipants.length})가 전체 좌석 수(${totalSeats})보다 많아 배정할 수 없습니다.`);
      }

      // 참가자를 칩 수 기준으로 정렬 (내림차순)
      const sortedParticipants = [...activeParticipants].sort((a, b) => (b.chips || 0) - (a.chips || 0));

      // Snake Draft 방식: 칩 레벨별 그룹 분류
      const totalPlayers = sortedParticipants.length;
      const totalTables = openTables.length;

      // 그룹 크기 계산 (상위/중간/하위로 최대한 균등 분할)
      const groupSize = Math.ceil(totalPlayers / 3);
      const topGroup = sortedParticipants.slice(0, groupSize);
      const middleGroup = sortedParticipants.slice(groupSize, groupSize * 2);
      const bottomGroup = sortedParticipants.slice(groupSize * 2);

      logger.info(`칩 그룹 분류 완료: 상위그룹 ${topGroup.length}명, 중간그룹 ${middleGroup.length}명, 하위그룹 ${bottomGroup.length}명`, {
        component: 'useTables'
      });

      // 테이블 상태 초기화
      interface TableState {
        id: string;
        tableNumber: number;
        participants: string[];
        totalChips: number;
        maxSeats: number;
        chipGroups: { top: number; middle: number; bottom: number }; // 각 그룹별 인원수 추적
      }

      const tableStates: TableState[] = openTables.map(table => ({
        id: table.id,
        tableNumber: table.tableNumber,
        participants: [],
        totalChips: 0,
        maxSeats: table.seats?.length || maxSeatsSetting,
        chipGroups: { top: 0, middle: 0, bottom: 0 }
      }));

      // Smart Balance 헬퍼 함수들 - 인원수 우선 고려
      const findBestTable = (tables: TableState[], preferLowChips: boolean): TableState | null => {
        const availableTables = tables.filter(table => table.participants.length < table.maxSeats);
        if (availableTables.length === 0) return null;

        // 1단계: 인원수가 가장 적은 테이블들 찾기 (균등 분배 우선)
        const minPlayers = Math.min(...availableTables.map(t => t.participants.length));
        const tablesWithMinPlayers = availableTables.filter(t => t.participants.length === minPlayers);

        // 2단계: 그 중에서 칩 기준으로 선택
        if (preferLowChips) {
          return tablesWithMinPlayers.reduce((lowest, current) =>
            current.totalChips < lowest.totalChips ? current : lowest
          );
        } else {
          return tablesWithMinPlayers.reduce((highest, current) =>
            current.totalChips > highest.totalChips ? current : highest
          );
        }
      };

      // 균형 검증 헬퍼 함수
      const isPlayerCountBalanced = (tables: TableState[]): boolean => {
        const playerCounts = tables.map(t => t.participants.length);
        const maxDiff = Math.max(...playerCounts) - Math.min(...playerCounts);
        return maxDiff <= 1;
      };

      // Smart Balance 알고리즘: 칩 균형 + 그룹 균등 분포
      let topIndex = 0, middleIndex = 0, bottomIndex = 0;

      logger.info(`🎯 Smart Balance 알고리즘 시작: 칩 균형과 그룹 균등 분포를 동시에 고려`, {
        component: 'useTables'
      });

      // 라운드별로 각 그룹에서 한 명씩 선택하여 배치
      while (topIndex < topGroup.length || middleIndex < middleGroup.length || bottomIndex < bottomGroup.length) {

        // Round 1: 상위 그룹에서 한 명 배치 (인원 최소 + 칩 최소 테이블)
        if (topIndex < topGroup.length) {
          const participant = topGroup[topIndex];
          const targetTable = findBestTable(tableStates, true); // preferLowChips = true
          if (targetTable && participant) {
            targetTable.participants.push(participant.id);
            targetTable.totalChips += participant.chips || 0;
            targetTable.chipGroups.top++;

            logger.debug(`상위그룹 ${participant.name} (${(participant.chips || 0).toLocaleString()}칩) → 테이블 ${targetTable.tableNumber} (인원: ${targetTable.participants.length}명, 총칩: ${targetTable.totalChips.toLocaleString()})`, {
              component: 'useTables'
            });
            topIndex++;
          }
        }

        // Round 2: 하위 그룹에서 한 명 배치 (인원 최소 + 칩 최대 테이블 - 균형 맞추기)
        if (bottomIndex < bottomGroup.length) {
          const participant = bottomGroup[bottomIndex];
          const targetTable = findBestTable(tableStates, false); // preferLowChips = false
          if (targetTable && participant) {
            targetTable.participants.push(participant.id);
            targetTable.totalChips += participant.chips || 0;
            targetTable.chipGroups.bottom++;

            logger.debug(`하위그룹 ${participant.name} (${(participant.chips || 0).toLocaleString()}칩) → 테이블 ${targetTable.tableNumber} (인원: ${targetTable.participants.length}명, 총칩: ${targetTable.totalChips.toLocaleString()})`, {
              component: 'useTables'
            });
            bottomIndex++;
          }
        }

        // Round 3: 중간 그룹에서 한 명 배치 (인원 최소 + 칩 최소 테이블)
        if (middleIndex < middleGroup.length) {
          const participant = middleGroup[middleIndex];
          const targetTable = findBestTable(tableStates, true); // preferLowChips = true
          if (targetTable && participant) {
            targetTable.participants.push(participant.id);
            targetTable.totalChips += participant.chips || 0;
            targetTable.chipGroups.middle++;

            logger.debug(`중간그룹 ${participant.name} (${(participant.chips || 0).toLocaleString()}칩) → 테이블 ${targetTable.tableNumber} (인원: ${targetTable.participants.length}명, 총칩: ${targetTable.totalChips.toLocaleString()})`, {
              component: 'useTables'
            });
            middleIndex++;
          }
        }
      }

      // 각 테이블의 좌석 배치
      for (const tableState of tableStates) {
        const table = openTables.find(t => t.id === tableState.id);
        if (!table) continue;
        
        const seatCount = table.seats?.length || maxSeatsSetting;
        const newSeats: (string | null)[] = Array(seatCount).fill(null);
        
        // 랜덤하게 좌석 배치
        const availableSeatIndexes = Array.from({ length: seatCount }, (_, i) => i);
        const shuffledIndexes = shuffleArray(availableSeatIndexes);
        
        tableState.participants.forEach((participantId, i) => {
          if (i < shuffledIndexes.length) {
            const seatIndex = shuffledIndexes[i];
            if (seatIndex !== undefined) {
              newSeats[seatIndex] = participantId;
            }
          }
        });
        
        const tableRef = doc(db, 'tables', table.id);
        batch.update(tableRef, { seats: newSeats });
      }
      
      await batch.commit();
      
      // Smart Balance 결과 로깅
      const balanceInfo = tableStates.map(state => ({
        tableNumber: state.tableNumber,
        playerCount: state.participants.length,
        totalChips: state.totalChips,
        chipGroups: state.chipGroups,
        avgChipsPerPlayer: state.participants.length > 0 ? Math.round(state.totalChips / state.participants.length) : 0
      }));

      // 결과 통계 계산
      const chipValues = balanceInfo.map(t => t.totalChips);
      const playerCounts = balanceInfo.map(t => t.playerCount);
      const avgChips = chipValues.reduce((a, b) => a + b, 0) / chipValues.length;
      const maxChips = Math.max(...chipValues);
      const minChips = Math.min(...chipValues);
      const chipRange = maxChips - minChips;
      const maxPlayers = Math.max(...playerCounts);
      const minPlayers = Math.min(...playerCounts);

      // 칩 균형도 점수 계산 (표준편차 기반)
      const chipStdDev = Math.sqrt(chipValues.reduce((sum, chips) => sum + Math.pow(chips - avgChips, 2), 0) / chipValues.length);
      const balanceScore = avgChips > 0 ? Math.max(0, 100 - (chipStdDev / avgChips * 100)) : 100;

      // Smart Balance 균형 결과 자세히 로깅
      // 균형 검증
      const playerCountBalanced = isPlayerCountBalanced(tableStates);
      const playerCountDiff = maxPlayers - minPlayers;

      const chipPercentDiff = avgChips > 0 ? (chipRange / avgChips * 100).toFixed(1) : '0';
      logger.info(`🎯 Smart Balance 칩 균형 재배치 완료`, {
        component: 'useTables'
      });
      logger.info(`📊 균형 성과 분석:`, {
        component: 'useTables'
      });
      logger.info(`⚖️ 칩 균형도: ${balanceScore.toFixed(1)}점/100점 (표준편차: ${chipStdDev.toFixed(0)}칩)`, {
        component: 'useTables'
      });
      logger.info(`💰 칩 분포: 평균 ${avgChips.toLocaleString()}칩 | 범위 ${minChips.toLocaleString()}~${maxChips.toLocaleString()} (차이: ${chipRange.toLocaleString()}칩, ${chipPercentDiff}%)`, {
        component: 'useTables'
      });
      logger.info(`👥 인원 분포: ${minPlayers}~${maxPlayers}명 (차이: ${playerCountDiff}명) ${playerCountBalanced ? '✅ 균등함' : '⚠️ 불균등함'}`, {
        component: 'useTables'
      });
      logger.info(`🎲 테이블별 세부 현황:`, {
        component: 'useTables'
      });

      // 각 테이블별 상세 정보 (그룹 분포 포함)
      balanceInfo.forEach(info => {
        const diffFromAvg = info.totalChips - avgChips;
        const percentDiff = avgChips > 0 ? (diffFromAvg / avgChips * 100).toFixed(1) : '0';
        const sign = diffFromAvg >= 0 ? '+' : '';
        const groupInfo = `[상위:${info.chipGroups.top} 중간:${info.chipGroups.middle} 하위:${info.chipGroups.bottom}]`;

        // 그룹 균등성 체크
        const groupBalance = Math.abs(info.chipGroups.top - info.chipGroups.middle) <= 1 &&
                            Math.abs(info.chipGroups.middle - info.chipGroups.bottom) <= 1 &&
                            Math.abs(info.chipGroups.top - info.chipGroups.bottom) <= 1;
        const balanceIcon = groupBalance ? '✅' : '⚠️';

        logger.info(`  ${balanceIcon} 테이블 ${info.tableNumber}: ${info.playerCount}명 ${groupInfo} | 총칩: ${info.totalChips.toLocaleString()} (1인평균: ${info.avgChipsPerPlayer.toLocaleString()}) | 전체평균대비: ${sign}${percentDiff}%`, {
          component: 'useTables'
        });
      });

      // 그룹별 분포 균등성 검증
      const groupDistribution = balanceInfo.reduce((acc, table) => {
        acc.top += table.chipGroups.top;
        acc.middle += table.chipGroups.middle;
        acc.bottom += table.chipGroups.bottom;
        return acc;
      }, { top: 0, middle: 0, bottom: 0 });

      const totalDistributed = groupDistribution.top + groupDistribution.middle + groupDistribution.bottom;

      // 그룹 분포의 균등성 점수 계산
      const idealDistribution = totalDistributed / 3;
      const groupBalanceScore = 100 - (
        (Math.abs(groupDistribution.top - idealDistribution) +
         Math.abs(groupDistribution.middle - idealDistribution) +
         Math.abs(groupDistribution.bottom - idealDistribution)) / totalDistributed * 100
      );

      logger.info(`🏆 그룹 분포 결과: 상위 ${groupDistribution.top}명, 중간 ${groupDistribution.middle}명, 하위 ${groupDistribution.bottom}명 (총 ${totalDistributed}명)`, {
        component: 'useTables'
      });
      logger.info(`📈 그룹 균등도: ${groupBalanceScore.toFixed(1)}점/100점 (이상값: ${idealDistribution.toFixed(1)}명씩)`, {
        component: 'useTables'
      });

      // 전체 성과 요약
      const overallScore = (balanceScore + groupBalanceScore) / 2;
      logger.info(`🎖️ 전체 균형 점수: ${overallScore.toFixed(1)}점/100점 (칩균형: ${balanceScore.toFixed(1)}점 + 그룹균등: ${groupBalanceScore.toFixed(1)}점)`, {
        component: 'useTables'
      });

      // 사용자 피드백 메시지
      if (!playerCountBalanced) {
        toast.warning(`⚠️ 인원 불균형: 테이블 간 최대 ${playerCountDiff}명 차이가 발생했습니다.`);
      } else if (overallScore >= 85) {
        toast.success(`🎉 균형 재배치 완료! 전체 점수: ${overallScore.toFixed(1)}점 (우수)`);
      } else if (overallScore >= 70) {
        toast.success(`✅ 균형 재배치 완료! 전체 점수: ${overallScore.toFixed(1)}점 (양호)`);
      } else {
        toast.warning(`⚠️ 균형 재배치 완료하였으나 점수가 낮습니다: ${overallScore.toFixed(1)}점`);
      }

      logAction('seats_reassigned_with_balancing', {
        participantsCount: activeParticipants.length,
        tableCount: openTables.length,
        balanceScore: balanceScore.toFixed(1),
        groupBalanceScore: groupBalanceScore.toFixed(1),
        overallScore: overallScore.toFixed(1),
        playerCountBalanced
      });
    } catch (e) {
      const errorContext = {
        failedAction: 'auto_balance_by_chips',
        participantsCount: activeParticipants.length,
        errorMessage: e instanceof Error ? e.message : String(e),
      };
      logAction('action_failed', errorContext);
      logger.error('칩 균형 재배치 중 오류 발생:', e instanceof Error ? e : new Error(String(e)), { component: 'useTables' });
      toast.error(`오류 발생: ${e instanceof Error ? e.message : String(e)}`);
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [maxSeatsSetting]);

  return { tables, setTables, loading, error, maxSeatsSetting, updateTableDetails, openNewTable, activateTable, closeTable, autoAssignSeats: rebalanceAndAssignAll, autoBalanceByChips, moveSeat, bustOutParticipant, updateTablePosition, updateTableOrder, updateTableMaxSeats };
};

export default useTables;
