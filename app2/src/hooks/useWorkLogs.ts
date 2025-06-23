import { useState, useEffect } from 'react';
import db from '../firebase';
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

// ... rest of the file is unchanged
