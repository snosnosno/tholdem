import { useState, useEffect } from 'react';
import db from '../firebase';
import { collection, onSnapshot, doc, runTransaction, DocumentData, QueryDocumentSnapshot, getDocs, writeBatch, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Participant } from './useParticipants';
import { logAction } from './useLogger';
export interface Table {
  id: string;
  name: string;
  tableNumber: number;
  seats: (string | null)[]; // participant.id 또는 null
  status?: 'open' | 'closed' | 'standby';
  borderColor?: string;
  position?: { x: number; y: number };
  assignedDealerId?: string | null;
}

export interface BalancingResult {
  participantId: string;
  fromTableNumber: number;
  fromSeatIndex: number;
  toTableNumber: number;
  toSeatIndex: number;
}
// ... the rest of the file is unchanged
