import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  QueryDocumentSnapshot,
  DocumentData,
  setDoc,
} from 'firebase/firestore';
import { logAction } from './useLogger';

export interface Staff {
  id: string;
  name: string;
  role: 'TD' | 'Dealer' | 'Cashier' | 'Chip Runner' | 'Other';
  contact?: string;
  status: 'active' | 'inactive' | 'on_break' | 'on_table' | 'available' | 'clocked_out';
  profileImageUrl?: string;
  assignedTableId?: string | null;
  totalWorkMinutes?: number;
  totalBreakMinutes?: number;
}

export const useStaff = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const staffCollection = collection(db, 'staff');
    const unsubscribe = onSnapshot(
      staffCollection,
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
    try {
      const docRef = await addDoc(collection(db, 'staff'), staffMember);
      logAction('staff_added', { staffId: docRef.id, ...staffMember });
      return docRef;
    } catch (e) {
      console.error("Error adding staff member: ", e);
      setError(e as Error);
    }
  };
  
  const addStaffWithId = async (id: string, staffMember: Omit<Staff, 'id'>) => {
    try {
      const staffDoc = doc(db, 'staff', id);
      await setDoc(staffDoc, staffMember);
      logAction('staff_added_with_id', { staffId: id, ...staffMember });
    } catch (e) {
      console.error("Error adding staff member with ID: ", e);
      setError(e as Error);
    }
  };
  
  const updateStaff = async (id: string, data: Partial<Staff>) => {
    const staffDoc = doc(db, 'staff', id);
    try {
      await updateDoc(staffDoc, data);
      logAction('staff_updated', { staffId: id, ...data });
    } catch (e) {
      console.error("Error updating staff member: ", e);
      setError(e as Error);
    }
  };

  const deleteStaff = async (id: string) => {
    const staffDoc = doc(db, 'staff', id);
    try {
      await deleteDoc(staffDoc);
      logAction('staff_deleted', { staffId: id });
    } catch (e) {
      console.error("Error deleting staff member: ", e);
       setError(e as Error);
    }
  };

  return { staff, loading, error, addStaff, updateStaff, deleteStaff, addStaffWithId };
};

export default useStaff;
