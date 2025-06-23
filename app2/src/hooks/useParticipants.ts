import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  DocumentData,
  QueryDocumentSnapshot,
  writeBatch,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { logAction } from './useLogger';

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
}

export const useParticipants = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const participantsCollection = collection(db, 'participants');
    const unsubscribe = onSnapshot(
      participantsCollection,
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
    try {
      const docRef = await addDoc(collection(db, 'participants'), participant);
      logAction('participant_added', { participantId: docRef.id, ...participant });
      return docRef;
    } catch (e) {
      console.error("Error adding participant: ", e);
      setError(e as Error);
    }
  };
  
  const updateParticipant = async (id: string, data: Partial<Participant>) => {
    const participantDoc = doc(db, 'participants', id);
    try {
      await updateDoc(participantDoc, data);
      logAction('participant_updated', { participantId: id, ...data });
    } catch (e) {
      console.error("Error updating participant: ", e);
      setError(e as Error);
    }
  };

  const deleteParticipant = async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Find the table where the participant is seated
        const tablesCollectionRef = collection(db, 'tables');
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
        const participantDoc = doc(db, 'participants', id);
        transaction.delete(participantDoc);
      });

      logAction('participant_deleted', { participantId: id });
    } catch (e) {
      console.error("Error deleting participant: ", e);
      setError(e as Error);
    }
  };
  
  const addParticipantAndAssignToSeat = async (participantData: Omit<Participant, 'id'>, tableId: string, seatIndex: number) => {
    setLoading(true);
    try {
        const newParticipantRef = doc(collection(db, 'participants'));
        await runTransaction(db, async (transaction) => {
            const tableRef = doc(db, 'tables', tableId);
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
            transaction.update(tableRef, { seats: seats });
        });
        logAction('participant_added_and_seated', { participantId: newParticipantRef.id, tableId, seatIndex });
    } catch (e) {
        console.error("Error adding participant and assigning to seat:", e);
        setError(e as Error);
        throw e;
    } finally {
        setLoading(false);
    }
  };

  return { participants, loading, error, addParticipant, updateParticipant, deleteParticipant, addParticipantAndAssignToSeat };
};

export default useParticipants;
