import { useState, useEffect } from 'react';
import db from '../firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, 
  DocumentData, QueryDocumentSnapshot, runTransaction, getDocs 
} from 'firebase/firestore';
import { Table } from './useTables';

export interface Participant {
  id: string;
  name: string;
  phone?: string;
  playerIdentifier?: string;
  participationMethod?: string;
  chips: number;
  status: 'active' | 'busted';
  tableId?: string;
  seatNumber?: number;
  // 추가 필드 정의 가능
}

const participantsCollection = collection(db, 'participants');

export const useParticipants = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(participantsCollection, 
      (snapshot) => {
        const participantsData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as Participant));
        setParticipants(participantsData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addParticipant = async (participant: Omit<Participant, 'id'>) => {
    await addDoc(participantsCollection, participant);
  };

  const updateParticipant = async (id: string, updatedData: Partial<Omit<Participant, 'id'>>) => {
    const participantDoc = doc(db, 'participants', id);
    await updateDoc(participantDoc, updatedData);
  };

  const deleteParticipant = async (id: string) => {
    await runTransaction(db, async (transaction) => {
      const participantRef = doc(db, 'participants', id);
      const participantSnap = await transaction.get(participantRef);

      if (!participantSnap.exists()) {
        throw new Error("삭제할 참가자를 찾을 수 없습니다.");
      }

      const participantData = participantSnap.data() as Participant;

      // If the participant is seated, clear their seat
      if (participantData.tableId && typeof participantData.seatNumber === 'number') {
        const tableRef = doc(db, 'tables', participantData.tableId);
        const tableSnap = await transaction.get(tableRef);

        if (tableSnap.exists()) {
          const tableData = tableSnap.data() as Table;
          const newSeats = [...(tableData.seats || [])];
          if (newSeats[participantData.seatNumber] === id) {
            newSeats[participantData.seatNumber] = null;
            transaction.update(tableRef, { seats: newSeats });
          }
        }
      }

      // Delete the participant document
      transaction.delete(participantRef);
    });
  };

  const addParticipantAndAssignToSeat = async (participant: Omit<Participant, 'id' | 'tableId' | 'seatNumber'>) => {
    return runTransaction(db, async (transaction) => {
      const tablesCollectionRef = collection(db, 'tables');
      const tablesSnapshot = await getDocs(tablesCollectionRef);
      const tablesData = tablesSnapshot.docs.map(d => ({ id: d.id, ...d.data(), tableNumber: d.data().tableNumber } as Table & { tableNumber: number }));

      if (tablesData.length === 0) throw new Error("테이블이 존재하지 않습니다.");
      
      const tableCounts = tablesData.map(t => ({
        ...t,
        participantCount: (t.seats || []).filter(s => s !== null).length,
      }));

      const minParticipants = Math.min(...tableCounts.map(t => t.participantCount));
      const candidateTables = tableCounts.filter(t => t.participantCount === minParticipants);

      const emptySeats = candidateTables.flatMap(t => 
        (t.seats || []).map((seat, index) => seat === null ? { tableId: t.id, seatIndex: index, tableNumber: t.tableNumber } : null)
                      .filter((s): s is { tableId: string; seatIndex: number; tableNumber: number; } => s !== null)
      );

      if (emptySeats.length === 0) throw new Error("빈 좌석이 없습니다.");

      const randomSeat = emptySeats[Math.floor(Math.random() * emptySeats.length)];

      const newParticipantRef = doc(participantsCollection);
      
      transaction.set(newParticipantRef, { 
        ...participant, 
        id: newParticipantRef.id, 
        tableId: randomSeat.tableId,
        seatNumber: randomSeat.seatIndex
      });

      const tableRef = doc(db, 'tables', randomSeat.tableId);
      const tableToUpdate = tablesData.find(t => t.id === randomSeat.tableId);
      if(tableToUpdate) {
        const newSeats = [...(tableToUpdate.seats || [])];
        newSeats[randomSeat.seatIndex] = newParticipantRef.id;
        transaction.update(tableRef, { seats: newSeats });
      }
      
      return { 
        success: true, 
        participantId: newParticipantRef.id, 
        tableNumber: randomSeat.tableNumber, 
        seatNumber: randomSeat.seatIndex + 1 
      };
    });
  };

  return { participants, loading, error, addParticipant, updateParticipant, deleteParticipant, addParticipantAndAssignToSeat };
}; 