import React from 'react';

interface JobPostingSkeletonProps {
  count?: number;
}

const JobPostingSkeleton: React.FC<JobPostingSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="bg-white p-3 sm:p-6 rounded-lg shadow-md border animate-pulse">
          {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
            <div className="flex-1">
              {/* Title skeleton */}
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              {/* Location skeleton */}
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            {/* Status badge skeleton */}
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>

          {/* Description skeleton */}
          <div className="mb-4">
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>

          {/* Date range skeleton */}
          <div className="mb-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>

          {/* Time slots skeleton */}
          <div className="mb-4">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>

          {/* Bottom section */}
          <div className="flex justify-between items-center pt-4 border-t">
            {/* Posted date skeleton */}
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            {/* Action buttons skeleton */}
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JobPostingSkeleton;