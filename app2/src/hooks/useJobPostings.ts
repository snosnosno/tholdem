import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getDocs, startAfter, limit } from 'firebase/firestore';
import { buildFilteredQuery } from '../firebase';

export interface JobPostingFilters {
  location: string;
  type: string;
  startDate: string;
  endDate: string;
  searchTerms?: string[]; // Optional search terms
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string;
  type: string;
  status: string;
  startDate: any;
  endDate: any;
  createdAt: any;
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
  return useInfiniteQuery({
    queryKey: ['jobPostings', 'infinite', filters],
    queryFn: async ({ pageParam }) => {
      const query = buildFilteredQuery(filters, {
        limit: 20,
        startAfterDoc: pageParam
      });
      
      const snapshot = await getDocs(query);
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JobPosting[];
      
      // Return jobs and cursor for next page
      return {
        jobs,
        nextCursor: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
};