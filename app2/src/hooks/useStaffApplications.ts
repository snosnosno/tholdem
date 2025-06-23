import { useState, useEffect } from 'react';
import db from '../firebase';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot
} from 'firebase/firestore';

export interface StaffApplication {
  id: string;
  staffId: string;
  eventId: string;
  date: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const staffApplicationsCollection = collection(db, 'staffApplications');

export const useStaffApplications = (filter?: Partial<StaffApplication>) => {
  const [applications, setApplications] = useState<StaffApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let q = staffApplicationsCollection;
    if (filter) {
      // 단일 필터만 지원 (복수 필터는 필요시 확장)
      const filterKeys = Object.keys(filter) as (keyof StaffApplication)[];
      if (filterKeys.length > 0) {
        q = query(staffApplicationsCollection, where(filterKeys[0], '==', filter[filterKeys[0]]));
      }
    }
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as StaffApplication));
        setApplications(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [JSON.stringify(filter)]);

  const addApplication = async (application: Omit<StaffApplication, 'id'>) => {
    await addDoc(staffApplicationsCollection, application);
  };

  const updateApplication = async (id: string, updatedData: Partial<Omit<StaffApplication, 'id'>>) => {
    const appDoc = doc(db, 'staffApplications', id);
    await updateDoc(appDoc, updatedData);
  };

  const deleteApplication = async (id: string) => {
    const appDoc = doc(db, 'staffApplications', id);
    await deleteDoc(appDoc);
  };

  return { applications, loading, error, addApplication, updateApplication, deleteApplication };
};
