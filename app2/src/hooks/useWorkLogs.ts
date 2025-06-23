import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot, Query, CollectionReference
} from 'firebase/firestore';

export interface WorkLog {
  id: string;
  staffId: string;
  clockIn: number; // timestamp
  clockOut: number | null; // timestamp
  clockInMethod: 'qr' | 'gps' | 'manual';
  clockInLocation?: { latitude: number, longitude: number };
  
  // Fields for payroll
  date?: string;
  totalMinutes?: number;
  wage?: number;
  approved?: boolean;
}

const workLogsCollection = collection(db, 'workLogs');

export const useWorkLogs = (filter?: Partial<WorkLog>) => {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let q: Query<DocumentData> | CollectionReference<DocumentData> = workLogsCollection;
    if (filter) {
      const filterKeys = Object.keys(filter) as (keyof WorkLog)[];
      if (filterKeys.length > 0) {
        const validFilter = Object.fromEntries(Object.entries(filter).filter(([_, v]) => v !== undefined));
        const validKeys = Object.keys(validFilter) as (keyof WorkLog)[];
        if (validKeys.length > 0) {
          q = query(workLogsCollection, where(validKeys[0], '==', validFilter[validKeys[0]]));
        }
      }
    }
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as WorkLog));
        setWorkLogs(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [JSON.stringify(filter)]);

  const addWorkLog = async (workLog: Omit<WorkLog, 'id'>) => {
    await addDoc(workLogsCollection, workLog);
  };

  const updateWorkLog = async (id: string, updatedData: Partial<Omit<WorkLog, 'id'>>) => {
    const workLogDoc = doc(db, 'workLogs', id);
    await updateDoc(workLogDoc, updatedData);
  };

  const deleteWorkLog = async (id: string) => {
    const workLogDoc = doc(db, 'workLogs', id);
    await deleteDoc(workLogDoc);
  };

  return { workLogs, loading, error, addWorkLog, updateWorkLog, deleteWorkLog };
};
