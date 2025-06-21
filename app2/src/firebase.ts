// Firebase 초기화 및 인증/DB 인스턴스 export
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDiwCKWr83N1NRy5NwA1WLc5bRD73VaqRo",
  authDomain: "tholdem-ebc18.firebaseapp.com",
  projectId: "tholdem-ebc18",
  storageBucket: "tholdem-ebc18.firebasestorage.app",
  messagingSenderId: "296074758861",
  appId: "1:296074758861:web:52498228694af470bcf784",
  measurementId: "G-S5BD0PBT3W"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

// --- Service Layer ---

/**
 * 특정 토너먼트의 기본 정보를 가져옵니다.
 * @param tournamentId 토너먼트 ID
 * @returns 토너먼트 데이터
 */
export const getTournament = async (tournamentId: string) => {
  const tournamentDocRef = doc(db, 'tournaments', tournamentId);
  const tournamentSnap = await getDoc(tournamentDocRef);
  if (tournamentSnap.exists()) {
    return tournamentSnap.data();
  } else {
    console.error("No such tournament!");
    return null;
  }
};

/**
 * 특정 토너먼트의 모든 참가자 목록을 가져옵니다.
 * @param tournamentId 토너먼트 ID
 * @returns 참가자 목록 배열
 */
export const getParticipants = async (tournamentId: string) => {
  const participantsColRef = collection(db, 'tournaments', tournamentId, 'participants');
  const participantsSnap = await getDocs(participantsColRef);
  return participantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export default db;
