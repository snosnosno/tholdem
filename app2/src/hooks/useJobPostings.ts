import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getDocs, startAfter, limit } from 'firebase/firestore';
import { buildFilteredQuery } from '../firebase';

export interface JobPostingFilters {
  location: string;
  type: string;
  startDate: string;
  role: string;
  month?: string; // Optional month filter (01-12)
  day?: string;   // Optional day filter (01-31)
  searchTerms?: string[]; // Optional search terms
}

export interface RoleRequirement {
  name: string;
  count: number;
}

export interface TimeSlot {
  time: string;
  roles: RoleRequirement[];
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string;
  type: string;
  status: 'open' | 'closed';
  startDate: any;
  endDate: any;
  createdAt: any;
  managerId?: string;
  timeSlots?: TimeSlot[];
  confirmedStaff?: { userId: string; role: string; timeSlot: string; }[];
  searchIndex?: string[];
  requirements?: any[];
  manager?: string;
  [key: string]: any;
}

export const useJobPostings = (filters: JobPostingFilters) => {
  return useQuery({
    queryKey: ['jobPostings', filters],
    queryFn: async (): Promise<JobPosting[]> => {
      const query = buildFilteredQuery(filters);
      const snapshot = await getDocs(query);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JobPosting[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

// Infinite scroll implementation
export const useInfiniteJobPostings = (filters: JobPostingFilters) => {
  return useInfiniteQuery<{ jobs: JobPosting[]; nextCursor: any | null }, Error>({
    queryKey: ['jobPostings', 'infinite', filters],
    queryFn: async ({ pageParam }) => {
      try {
        console.log('🔍 useInfiniteJobPostings queryFn called with:', { filters, pageParam });
        
        const query = buildFilteredQuery(filters, {
          limit: 20,
          startAfterDoc: pageParam
        });
        
        console.log('📋 Executing Firebase query...');
        const snapshot = await getDocs(query);
        
        const jobs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as JobPosting[];
        
        console.log('✅ Query successful:', { jobCount: jobs.length, hasNextPage: snapshot.docs.length >= 20 });
        
        // Return jobs and cursor for next page
        return {
          jobs,
          nextCursor: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
        };
      } catch (error) {
        console.error('❌ useInfiniteJobPostings error:', error);
        throw error;
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage: { jobs: JobPosting[]; nextCursor: any | null }) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
};