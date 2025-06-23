import { useState, useEffect } from 'react';
import db from '../firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot
} from 'firebase/firestore';

export interface Event {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  staffingNeeds?: Record<string, Record<string, number>>; // 날짜별 포지션별 인원
}

const eventsCollection = collection(db, 'events');

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(eventsCollection,
      (snapshot) => {
        const data = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as Event));
        setEvents(data);
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
    await addDoc(eventsCollection, event);
  };

  const updateEvent = async (id: string, updatedData: Partial<Omit<Event, 'id'>>) => {
    const eventDoc = doc(db, 'events', id);
    await updateDoc(eventDoc, updatedData);
  };

  const deleteEvent = async (id: string) => {
    const eventDoc = doc(db, 'events', id);
    await deleteDoc(eventDoc);
  };

  return { events, loading, error, addEvent, updateEvent, deleteEvent };
};
