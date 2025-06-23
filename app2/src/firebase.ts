// Firebase 초기화 및 인증/DB 인스턴스 export
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, collection, getDocs, writeBatch } from "firebase/firestore";
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDiwCKWr83N1NRy5NwA1WLc5bRD73VaqRo",
  authDomain: "tholdem-ebc18.firebaseapp.com",
  projectId: "tholdem-ebc18",
  storageBucket: "tholdem-ebc18.appspot.com",
  messagingSenderId: "296074758861",
  appId: "1:296074758861:web:52498228694af470bcf784",
  measurementId: "G-S5BD0PBT3W"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// ... rest of file is unchanged
