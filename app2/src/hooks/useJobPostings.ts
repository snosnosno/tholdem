import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getDocs, startAfter, limit } from 'firebase/firestore';
import { buildFilteredQuery } from '../firebase';

// Import types from centralized type definitions
import {
  JobPostingFilters,
  JobPosting,
  TimeSlot,
  RoleRequirement,
  ConfirmedStaff,
  JobPostingUtils
} from '../types/jobPosting';
// Re-export types for backward compatibility
export type {
  JobPostingFilters,
  JobPosting,
  TimeSlot,
  RoleRequirement,
  ConfirmedStaff
} from '../types/jobPosting';

export {
  JobPostingUtils
} from '../types/jobPosting';

export const useJobPostings = (filters: JobPostingFilters) => {
  return useQuery({
    queryKey: ['jobPostings', filters],
    queryFn: async (): Promise<JobPosting[]> => {
      const query = buildFilteredQuery(filters);
      const snapshot = await getDocs(query);
      let jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JobPosting[];
      
      // Client-side filtering for cases where Firebase query constraints are limited
      if (filters.startDate && filters.role && filters.role !== 'all') {
        console.log('🔍 Applying client-side role filter:', filters.role);
        jobs = jobs.filter(job => {
          const requiredRoles = job.requiredRoles || [];
          return requiredRoles.includes(filters.role);
        });
      }
      
      // Client-side location filtering when role filter took priority
      if (filters.startDate && filters.role && filters.role !== 'all' && filters.location && filters.location !== 'all') {
        console.log('🔍 Applying client-side location filter:', filters.location);
        jobs = jobs.filter(job => job.location === filters.location);
      }
      
      // Client-side type filtering when role filter took priority  
      if (filters.startDate && filters.role && filters.role !== 'all' && filters.type && filters.type !== 'all') {
        console.log('🔍 Applying client-side type filter:', filters.type);
        jobs = jobs.filter(job => job.type === filters.type);
      }
      
      return jobs;
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
        
        let jobs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as JobPosting[];
        
        // Client-side filtering for cases where Firebase query constraints are limited
        // This happens when we have date + role filters (Firebase doesn't allow inequality + array-contains)
        if (filters.startDate && filters.role && filters.role !== 'all') {
          console.log('🔍 Applying client-side role filter:', filters.role);
          jobs = jobs.filter(job => {
            const requiredRoles = job.requiredRoles || [];
            return requiredRoles.includes(filters.role);
          });
        }
        
        // Client-side location filtering when role filter took priority
        if (filters.startDate && filters.role && filters.role !== 'all' && filters.location && filters.location !== 'all') {
          console.log('🔍 Applying client-side location filter:', filters.location);
          jobs = jobs.filter(job => job.location === filters.location);
        }
        
        // Client-side type filtering when role filter took priority  
        if (filters.startDate && filters.role && filters.role !== 'all' && filters.type && filters.type !== 'all') {
          console.log('🔍 Applying client-side type filter:', filters.type);
          jobs = jobs.filter(job => job.type === filters.type);
        }
        
        console.log('✅ Query successful:', { 
          originalCount: snapshot.docs.length, 
          filteredCount: jobs.length, 
          hasNextPage: snapshot.docs.length >= 20 
        });
        
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