import { useState, useEffect } from 'react';
import db from '../firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, QueryDocumentSnapshot, DocumentData 
} from 'firebase/firestore';

export interface Staff {
  id: string;
  name: string;
  role: string;
  contact?: string;
  profilePictureUrl?: string;
  status?: 'available' | 'on_table' | 'on_break' | 'clocked_out';
  assignedTableId?: string | null;
  lastClockIn?: number | null;
  lastBreakStart?: number | null;
  totalWorkMinutes?: number;
  totalBreakMinutes?: number;
  [key: string]: any;
}

const staffCollection = collection(db, 'staff');

export const useStaff = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(staffCollection, 
      (snapshot) => {
        const staffData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as Staff));
        setStaff(staffData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addStaff = async (staffMember: Omit<Staff, 'id'>) => {
    await addDoc(staffCollection, staffMember);
  };

  const updateStaff = async (id: string, updatedData: Partial<Omit<Staff, 'id'>>) => {
    const staffDoc = doc(db, 'staff', id);
    await updateDoc(staffDoc, updatedData);
  };

  const deleteStaff = async (id: string) => {
    const staffDoc = doc(db, 'staff', id);
    await deleteDoc(staffDoc);
  };

  return { staff, loading, error, addStaff, updateStaff, deleteStaff };
};
