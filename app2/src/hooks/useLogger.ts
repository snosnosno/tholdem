import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const logsCollection = collection(db, 'action_logs');
// ... rest of the file is unchanged
