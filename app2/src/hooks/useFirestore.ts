import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, getDocs } from 'firebase/firestore';

// 특정 문서 하나를 실시간으로 가져오는 훅
export const useDocument = (collectionPath: string, docId: string) => {
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
        setLoading(false);
        return;
    };

    const docRef = doc(db, collectionPath, docId);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setDocument({ id: doc.id, ...doc.data() });
      } else {
        setDocument(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching document: ", err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionPath, docId]);

  const updateDocument = async (data: any) => {
    const docRef = doc(db, collectionPath, docId);
    try {
      await updateDoc(docRef, data);
    } catch (err) {
      console.error("Error updating document: ", err);
      throw err;
    }
  };

  const upsertDocument = async (data: any) => {
    const docRef = doc(db, collectionPath, docId);
    try {
        await setDoc(docRef, data, { merge: true });
    } catch(err) {
        console.error("Error setting document: ", err);
        throw err;
    }
  }
  
  return { document, loading, error, updateDocument, upsertDocument };
};

// 특정 컬렉션의 모든 문서를 가져오는 훅
export const useCollection = (collectionPath: string) => {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const collectionRef = collection(db, collectionPath);
        const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDocuments(docs);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching collection: ", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionPath]);

    return { documents, loading, error };
}
