import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  runTransaction,
  collectionGroup,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { logger } from '../utils/logger';
import { useState, useEffect } from 'react';

import { db } from '../firebase';
import { safeOnSnapshot } from '../utils/firebaseConnectionManager';
import { withFirebaseErrorHandling } from '../utils/firebaseUtils';

import { logAction } from './useLogger';
import { isDefaultTournament } from './useTournaments';


export interface Participant {
  id: string;
  name: string;
  phone?: string;
  status: 'active' | 'busted' | 'no-show';
  chips: number;
  tableNumber?: number;
  seatNumber?: number;
  buyInAmount?: number;
  rebuys?: number;
  addOns?: number;
  playerIdentifier?: string;
  participationMethod?: string;
  tournamentId?: string | null; // 소속 토너먼트 ID (전체 보기 기능용)
  userId?: string; // 사용자 ID
  etc?: string; // 기타 정보
  note?: string; // 비고
}

/**
 * useParticipants Hook (멀티 테넌트 버전)
 * 특정 사용자의 특정 토너먼트 참가자 데이터를 관리합니다.
 * 
 * @param userId - 현재 사용자 ID
 * @param tournamentId - 현재 토너먼트 ID
 * @returns 참가자 목록, 로딩 상태, 에러, CRUD 작업 함수들
 */
export const useParticipants = (userId: string | null, tournamentId: string | null) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // userId 또는 tournamentId가 없으면 빈 상태로 유지
    if (!userId || !tournamentId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    // "ALL" 전체 보기 모드 또는 날짜별 기본 토너먼트 모드
    if (tournamentId === 'ALL' || isDefaultTournament(tournamentId)) {
      // collectionGroup으로 모든 토너먼트의 참가자 조회
      const participantsGroupRef = collectionGroup(db, 'participants');

      // 날짜별 기본 토너먼트인 경우 dateKey 추출
      const dateKeyForFilter = isDefaultTournament(tournamentId)
        ? tournamentId.replace('DEFAULT_DATE_', '') // "DEFAULT_DATE_2025-01-20" -> "2025-01-20"
        : null;

      const unsubscribe = onSnapshot(
        participantsGroupRef,
        async (snapshot) => {
          const participantsData = snapshot.docs
            .map((doc: QueryDocumentSnapshot<DocumentData>) => {
              const data = doc.data();
              // tournamentId 추출 (path: users/{userId}/tournaments/{tournamentId}/participants/{participantId})
              const pathParts = doc.ref.path.split('/');
              const extractedTournamentId = pathParts[3] || null;

              // 현재 사용자의 참가자만 필터링
              const pathUserId = pathParts[1];
              if (pathUserId !== userId) return null;

              return {
                id: doc.id,
                ...data,
                tournamentId: extractedTournamentId, // 어느 토너먼트 소속인지 저장
              } as Participant;
            })
            .filter((participant): participant is Participant => participant !== null);

          // 날짜별 전체보기인 경우 해당 날짜의 참가자만 필터링
          let filteredParticipants = participantsData;
          if (dateKeyForFilter) {
            // 해당 날짜의 토너먼트를 찾기 위해 tournaments 컬렉션 조회
            const tournamentsSnapshot = await getDocs(collection(db, `users/${userId}/tournaments`));
            const tournamentDateMap = new Map<string, string>();

            tournamentsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              if (data.dateKey) {
                tournamentDateMap.set(doc.id, data.dateKey);
              }
            });

            // 해당 날짜의 토너먼트에 속한 참가자만 필터링
            filteredParticipants = participantsData.filter(participant => {
              if (!participant.tournamentId) return false;
              const participantDateKey = tournamentDateMap.get(participant.tournamentId);
              return participantDateKey === dateKeyForFilter;
            });

            logger.info('날짜별 전체보기 참가자 필터링 완료', {
              component: 'useParticipants',
              data: {
                dateKey: dateKeyForFilter,
                totalParticipants: participantsData.length,
                filteredParticipants: filteredParticipants.length
              }
            });
          }

          setParticipants(filteredParticipants);
          setLoading(false);
          logger.info('전체 참가자 목록 로드 완료', {
            component: 'useParticipants',
            data: { userId, count: filteredParticipants.length },
          });
        },
        (err) => {
          setError(err);
          setLoading(false);
          logger.error('전체 참가자 목록 구독 실패:', err, { component: 'useParticipants' });
        }
      );

      return () => {
        unsubscribe();
      };
    }

    // 일반 모드 (특정 토너먼트)
    // 멀티 테넌트 경로: users/{userId}/tournaments/{tournamentId}/participants
    const participantsPath = `users/${userId}/tournaments/${tournamentId}/participants`;

    const unsubscribe = safeOnSnapshot<Participant>(
      participantsPath,
      (participantsData) => {
        setParticipants(participantsData);
        setLoading(false);
        logger.info('참가자 목록 로드 완료', {
          component: 'useParticipants',
          data: { userId, tournamentId, count: participantsData.length },
        });
      },
      (err) => {
        setError(err);
        setLoading(false);
        logger.error('참가자 목록 구독 실패:', err, { component: 'useParticipants' });
      }
    );
    return () => unsubscribe();
  }, [userId, tournamentId]);

  const addParticipant = async (participant: Omit<Participant, 'id'>) => {
    if (!userId || !tournamentId) {
      throw new Error('사용자 ID와 토너먼트 ID가 필요합니다.');
    }

    return withFirebaseErrorHandling(async () => {
      const participantsPath = `users/${userId}/tournaments/${tournamentId}/participants`;
      const docRef = await addDoc(collection(db, participantsPath), participant);
      logAction('participant_added', { participantId: docRef.id, ...participant });
      return docRef;
    }, 'addParticipant');
  };
  
  const updateParticipant = async (id: string, data: Partial<Participant>) => {
    if (!userId || !tournamentId) {
      throw new Error('사용자 ID와 토너먼트 ID가 필요합니다.');
    }

    return withFirebaseErrorHandling(async () => {
      const participantDoc = doc(db, `users/${userId}/tournaments/${tournamentId}/participants`, id);
      await updateDoc(participantDoc, data);
      logAction('participant_updated', { participantId: id, ...data });
    }, 'updateParticipant');
  };

  const deleteParticipant = async (id: string) => {
    if (!userId || !tournamentId) {
      throw new Error('사용자 ID와 토너먼트 ID가 필요합니다.');
    }

    return withFirebaseErrorHandling(async () => {
      await runTransaction(db, async (transaction) => {
        // 1. Find the table where the participant is seated
        const tablesPath = `users/${userId}/tournaments/${tournamentId}/tables`;
        const tablesCollectionRef = collection(db, tablesPath);
        const tablesSnapshot = await getDocs(tablesCollectionRef);
        
        let foundTableRef = null;
        let newSeats: (string | null)[] = [];

        for (const tableDoc of tablesSnapshot.docs) {
          const tableData = tableDoc.data();
          const seats = tableData.seats as (string | null)[];
          if (seats && seats.includes(id)) {
            newSeats = seats.map(seatId => (seatId === id ? null : seatId));
            foundTableRef = tableDoc.ref;
            break; 
          }
        }
        
        // 2. If participant is seated, update the table
        if (foundTableRef) {
          transaction.update(foundTableRef, { seats: newSeats });
        }
        
        // 3. Delete the participant
        const participantDoc = doc(db, `users/${userId}/tournaments/${tournamentId}/participants`, id);
        transaction.delete(participantDoc);
      });

      logAction('participant_deleted', { participantId: id });
    }, 'deleteParticipant');
  };
  
  const addParticipantAndAssignToSeat = async (participantData: Omit<Participant, 'id'>, tableId: string, seatIndex: number) => {
    if (!userId || !tournamentId) {
      throw new Error('사용자 ID와 토너먼트 ID가 필요합니다.');
    }

    setLoading(true);
    try {
        const participantsPath = `users/${userId}/tournaments/${tournamentId}/participants`;
        const newParticipantRef = doc(collection(db, participantsPath));
        
        await runTransaction(db, async (transaction) => {
            const tableRef = doc(db, `users/${userId}/tournaments/${tournamentId}/tables`, tableId);
            const tableDoc = await transaction.get(tableRef);

            if (!tableDoc.exists()) {
                throw new Error("Table does not exist!");
            }

            const tableData = tableDoc.data();
            const seats = tableData.seats || [];

            if (seats[seatIndex] !== null) {
                throw new Error("Seat is already taken!");
            }

            seats[seatIndex] = newParticipantRef.id;
            
            transaction.set(newParticipantRef, participantData);
            transaction.update(tableRef, { seats });
        });
        logAction('participant_added_and_seated', { participantId: newParticipantRef.id, tableId, seatIndex });
    } catch (e) {
        logger.error('Error adding participant and assigning to seat:', e instanceof Error ? e : new Error(String(e)), { component: 'useParticipants' });
        setError(e as Error);
        throw e;
    } finally {
        setLoading(false);
    }
  };

  return { participants, loading, error, addParticipant, updateParticipant, deleteParticipant, addParticipantAndAssignToSeat };
};

export default useParticipants;
