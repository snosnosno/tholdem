import { Query, CollectionReference } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import db from '../firebase';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot
} from 'firebase/firestore';

export interface Assignment {
  id: string;
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'afternoon' | 'full';
  position: string;
  staffId: string;
}

const assignmentsCollection = collection(db, 'assignments');

export const useAssignments = (filter?: Partial<Assignment>) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
        let q: Query<DocumentData> | CollectionReference<DocumentData> = assignmentsCollection;
    if (filter) {
      const filterKeys = Object.keys(filter) as (keyof Assignment)[];
      if (filterKeys.length > 0) {
        q = query(assignmentsCollection, where(filterKeys[0], '==', filter[filterKeys[0]]));
      }
    }
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as Assignment));
        setAssignments(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [JSON.stringify(filter)]);

  const addAssignment = async (assignment: Omit<Assignment, 'id'>) => {
    await addDoc(assignmentsCollection, assignment);
  };

  const updateAssignment = async (id: string, updatedData: Partial<Omit<Assignment, 'id'>>) => {
    const assignmentDoc = doc(db, 'assignments', id);
    await updateDoc(assignmentDoc, updatedData);
  };

  const deleteAssignment = async (id: string) => {
    const assignmentDoc = doc(db, 'assignments', id);
    await deleteDoc(assignmentDoc);
  };

  return { assignments, loading, error, addAssignment, updateAssignment, deleteAssignment };
};
