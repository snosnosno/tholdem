import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  doc, onSnapshot, updateDoc, setDoc, collection, query, where, orderBy, limit, Query, DocumentData, QueryConstraint
} from 'firebase/firestore';

// ... (useDocument hook remains the same)
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

interface QueryOptions {
    where?: [string, any, any][];
    orderBy?: [string, 'asc' | 'desc'][];
    limit?: number;
}

// 특정 컬렉션의 문서를 가져오는 훅 (쿼리 옵션 포함)
export const useCollection = (collectionPath: string, queryOptions?: QueryOptions) => {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // queryOptions가 렌더링마다 변경되어 무한 루프를 유발하는 것을 방지하기 위해 useMemo를 사용
    const memoizedQuery = useMemo(() => {
        const constraints: QueryConstraint[] = [];
        if (queryOptions) {
            if (queryOptions.where) {
                queryOptions.where.forEach(w => constraints.push(where(...w)));
            }
            if (queryOptions.orderBy) {
                queryOptions.orderBy.forEach(o => constraints.push(orderBy(...o)));
            }
            if (queryOptions.limit) {
                constraints.push(limit(queryOptions.limit));
            }
        }
        return query(collection(db, collectionPath), ...constraints);
    }, [collectionPath, JSON.stringify(queryOptions)]); // 여전히 JSON.stringify가 가장 안정적인 방법입니다.

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(memoizedQuery, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDocuments(docs);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching collection: ", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [memoizedQuery]);

    return { documents, loading, error };
}
