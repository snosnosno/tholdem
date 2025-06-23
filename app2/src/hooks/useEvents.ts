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
} from 'firebase/firestore';
import { logAction } from './useLogger';

export interface Event {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  staffingNeeds: { [key: string]: number }; // e.g. { 'Dealer': 10, 'TD': 2 }
  description?: string;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const eventsCollection = collection(db, 'events');
    const unsubscribe = onSnapshot(
      eventsCollection,
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as Event));
        setEvents(eventsData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const addEvent = async (event: Omit<Event, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'events'), event);
      logAction('event_added', { eventId: docRef.id, ...event });
    } catch (e) {
      console.error('Error adding event:', e);
      setError(e as Error);
    }
  };

  const updateEvent = async (id: string, data: Partial<Event>) => {
    const eventDoc = doc(db, 'events', id);
    try {
      await updateDoc(eventDoc, data);
      logAction('event_updated', { eventId: id, ...data });
    } catch (e) {
      console.error('Error updating event:', e);
      setError(e as Error);
    }
  };

  const deleteEvent = async (id: string) => {
    const eventDoc = doc(db, 'events', id);
    try {
      await deleteDoc(eventDoc);
      logAction('event_deleted', { eventId: id });
    } catch (e) {
      console.error('Error deleting event:', e);
      setError(e as Error);
    }
  };

  return { events, loading, error, addEvent, updateEvent, deleteEvent };
};

export default useEvents;
