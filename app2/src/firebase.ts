// Firebase 초기화 및 인증/DB 인스턴스 export
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, collection, getDocs, writeBatch, getDoc, setDoc, updateDoc, arrayUnion, query, where, orderBy, limit, startAfter, Timestamp, Query } from "firebase/firestore";
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import type { JobPostingFilters } from './hooks/useJobPostings';
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
export const db = getFirestore(app); // Export db as a named export
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const setupTestData = async () => {
  const tablesCollectionRef = collection(db, 'tables');
  const snapshot = await getDocs(tablesCollectionRef);

  if (!snapshot.empty) {
    console.log("Test data already exists. Skipping setup.");
    return 'SKIPPED';
  }

  const batch = writeBatch(db);

  // Create 10 tables
  for (let i = 1; i <= 10; i++) {
    const tableRef = doc(collection(db, 'tables'));
    batch.set(tableRef, {
      tableNumber: i,
      seats: Array(9).fill(null),
    });
  }

  // Create 80 participants
  const participantsCollectionRef = collection(db, 'participants');
  for (let i = 1; i <= 80; i++) {
    const participantRef = doc(collection(db, 'participants'));
    batch.set(participantRef, {
      name: `Participant ${i}`,
      chips: 10000,
      buyInStatus: 'paid',
      status: 'active',
    });
  }

  try {
    await batch.commit();
    console.log("Test data successfully written to Firestore.");
    return 'SUCCESS';
  } catch (error) {
    console.error("Error writing test data: ", error);
    return 'ERROR';
  }
};

export const promoteToStaff = async (userId: string, userName: string, jobRole: string, postingId: string, managerId: string) => {
  console.log('🔍 promoteToStaff 함수 호출:', { userId, userName, jobRole, postingId, managerId });
  
  if (!userId || !jobRole || !userName || !postingId || !managerId) {
    console.error("User ID, User Name, Job Role, Posting ID, and Manager ID are required to promote to staff.");
    return;
  }

  const staffRef = doc(db, 'staff', userId);
  
  try {
    console.log('🔍 staff 문서 확인 시도:', userId);
    const staffSnap = await getDoc(staffRef);
    if (!staffSnap.exists()) {
      console.log('✅ 새로운 staff 문서 생성 시도');
      await setDoc(staffRef, {
        name: userName,
        userRole: 'staff',
        jobRole: [jobRole],
        assignedEvents: [postingId],
        createdAt: new Date(),
        managerId: managerId,
        postingId: postingId,
      });
      console.log(`✅ New staff document created for user: ${userName} (${userId}) with role: ${jobRole}`);
    } else {
      console.log('🔄 기존 staff 문서 업데이트 시도');
      // 스태프 문서가 있으면 jobRole 및 이벤트 참여 이력 업데이트
      await updateDoc(staffRef, {
        jobRole: arrayUnion(jobRole),
        assignedEvents: arrayUnion(postingId)
      });
      console.log(`Staff document updated for user: ${userName} (${userId}). Added role: ${jobRole} for posting: ${postingId}`);
    }
  } catch (error) {
    console.error(`Failed to promote user ${userName} (${userId}) to staff:`, error);
  }
};

interface PaginationOptions {
  limit?: number;
  startAfterDoc?: any;
}

// Build filtered query for job postings - OPTIMIZED VERSION
export const buildFilteredQuery = (
  filters: JobPostingFilters, 
  pagination?: PaginationOptions
): Query => {
  const jobPostingsRef = collection(db, 'jobPostings');
  let queryConstraints: any[] = [];
  
  console.log('🔍 Building query with filters:', filters);
  
  // Always filter for open status
  queryConstraints.push(where('status', '==', 'open'));
  
  // Prioritize search over other filters for performance
  if (filters.searchTerms && filters.searchTerms.length > 0) {
    console.log('🔍 Search mode activated with terms:', filters.searchTerms);
    // When searching, only use location or type filter to reduce complexity
    queryConstraints.push(where('searchIndex', 'array-contains-any', filters.searchTerms));
    
    // Add one additional filter to avoid too many combinations
    if (filters.location && filters.location !== 'all') {
      queryConstraints.push(where('location', '==', filters.location));
    } else if (filters.type && filters.type !== 'all') {
      queryConstraints.push(where('type', '==', filters.type));
    }
    
    // Use createdAt ordering for search results
    queryConstraints.push(orderBy('createdAt', 'desc'));
  } else {
    // When not searching, apply other filters
    if (filters.location && filters.location !== 'all') {
      console.log('🔍 Location filter applied:', filters.location);
      queryConstraints.push(where('location', '==', filters.location));
    }
    
    if (filters.type && filters.type !== 'all') {
      console.log('🔍 Type filter applied:', filters.type);
      queryConstraints.push(where('type', '==', filters.type));
    }
    
    // Date filters - prioritize over other filters to avoid complex indexes
    if (filters.startDate) {
      console.log('🔍 Date filter applied:', filters.startDate);
      // Create date at start of day to match job postings
      const filterDate = new Date(filters.startDate);
      filterDate.setHours(0, 0, 0, 0);
      
      // Handle both Timestamp and string date formats in database
      // First try with Timestamp comparison
      const startDateTimestamp = Timestamp.fromDate(filterDate);
      console.log('🔍 Converted date to Timestamp:', startDateTimestamp);
      
      // For backward compatibility, also check string format (YYYY-MM-DD)
      const startDateString = filters.startDate;
      console.log('🔍 Date string format:', startDateString);
      
      // Use Timestamp for comparison (assuming most recent data uses Timestamp)
      queryConstraints.push(where('startDate', '>=', startDateTimestamp));
      queryConstraints.push(orderBy('startDate', 'asc'));
    } else {
      // Role filter - only if no date filter to avoid complex indexes
      if (filters.role && filters.role !== 'all') {
        console.log('🔍 Role filter applied:', filters.role);
        queryConstraints.push(where('requiredRoles', 'array-contains', filters.role));
      }
      
      // Use createdAt ordering when no date filter
      queryConstraints.push(orderBy('createdAt', 'desc'));
    }
  }
  
  // Add startAfter for pagination if provided
  if (pagination?.startAfterDoc) {
    queryConstraints.push(startAfter(pagination.startAfterDoc));
  }
  
  // Add limit (default 20 for regular queries, customizable for infinite scroll)
  queryConstraints.push(limit(pagination?.limit || 20));
  
  console.log('🔍 Final query constraints count:', queryConstraints.length);
  console.log('🔍 Query constraints:', queryConstraints.map((c, i) => `${i}: ${c.type || 'unknown'}`));
  
  return query(jobPostingsRef, ...queryConstraints);
};

// Migration function to add searchIndex to existing job postings
export const migrateJobPostingsSearchIndex = async (): Promise<void> => {
  console.log('Starting searchIndex migration for job postings...');
  
  try {
    const jobPostingsRef = collection(db, 'jobPostings');
    const snapshot = await getDocs(jobPostingsRef);
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      
      // Skip if searchIndex already exists
      if (data.searchIndex) {
        return;
      }
      
      const title = data.title || '';
      const description = data.description || '';
      
      // Generate search index
      const searchIndex = generateSearchIndexForJobPosting(title, description);
      
      // Update document
      const docRef = doc(db, 'jobPostings', docSnapshot.id);
      batch.update(docRef, { searchIndex });
      updateCount++;
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updateCount} job postings with searchIndex`);
    } else {
      console.log('No job postings needed searchIndex migration');
    }
  } catch (error) {
    console.error('Error during searchIndex migration:', error);
    throw error;
  }
};

// Migration function to add requiredRoles to existing job postings
export const migrateJobPostingsRequiredRoles = async (): Promise<void> => {
  console.log('Starting requiredRoles migration for job postings...');
  
  try {
    const jobPostingsRef = collection(db, 'jobPostings');
    const snapshot = await getDocs(jobPostingsRef);
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      
      // Skip if requiredRoles already exists
      if (data.requiredRoles && Array.isArray(data.requiredRoles)) {
        return;
      }
      
      // Extract roles from timeSlots
      const timeSlots = data.timeSlots || [];
      const requiredRoles = Array.from(new Set(
        timeSlots.flatMap((ts: any) => {
          if (ts.roles && Array.isArray(ts.roles)) {
            return ts.roles.map((r: any) => r.name);
          }
          return [];
        })
      ));
      
      console.log(`Document ${docSnapshot.id}: extracted roles:`, requiredRoles);
      
      // Update document
      const docRef = doc(db, 'jobPostings', docSnapshot.id);
      batch.update(docRef, { requiredRoles });
      updateCount++;
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updateCount} job postings with requiredRoles`);
    } else {
      console.log('No job postings needed requiredRoles migration');
    }
  } catch (error) {
    console.error('Error during requiredRoles migration:', error);
    throw error;
  }
};

// Migration function to convert string dates to Timestamps
export const migrateJobPostingsDateFormat = async (): Promise<void> => {
  console.log('Starting date format migration for job postings...');
  
  try {
    const jobPostingsRef = collection(db, 'jobPostings');
    const snapshot = await getDocs(jobPostingsRef);
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      
      // Check if startDate is a string and needs conversion
      if (data.startDate && typeof data.startDate === 'string') {
        const dateObj = new Date(data.startDate);
        if (!isNaN(dateObj.getTime())) {
          const startDateTimestamp = Timestamp.fromDate(dateObj);
          console.log(`Document ${docSnapshot.id}: converting date ${data.startDate} to Timestamp`);
          
          // Update document
          const docRef = doc(db, 'jobPostings', docSnapshot.id);
          batch.update(docRef, { startDate: startDateTimestamp });
          updateCount++;
        }
      }
      
      // Also handle endDate if it exists
      if (data.endDate && typeof data.endDate === 'string') {
        const dateObj = new Date(data.endDate);
        if (!isNaN(dateObj.getTime())) {
          const endDateTimestamp = Timestamp.fromDate(dateObj);
          console.log(`Document ${docSnapshot.id}: converting endDate ${data.endDate} to Timestamp`);
          
          // Update document
          const docRef = doc(db, 'jobPostings', docSnapshot.id);
          batch.update(docRef, { endDate: endDateTimestamp });
          updateCount++;
        }
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updateCount} job postings with proper date format`);
    } else {
      console.log('No job postings needed date format migration');
    }
  } catch (error) {
    console.error('Error during date format migration:', error);
    throw error;
  }
};

// Helper function to generate search index for job postings
const generateSearchIndexForJobPosting = (title: string, description: string): string[] => {
  const text = `${title} ${description}`.toLowerCase();
  const words = text
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1);
  
  return Array.from(new Set(words));
};

// Run all migrations for job postings
export const runJobPostingsMigrations = async (): Promise<void> => {
  console.log('🔄 Starting all job postings migrations...');
  
  try {
    await migrateJobPostingsRequiredRoles();
    await migrateJobPostingsDateFormat();
    await migrateJobPostingsSearchIndex();
    console.log('✅ All job postings migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};