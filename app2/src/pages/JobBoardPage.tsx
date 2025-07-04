import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, runJobPostingsMigrations } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useInfiniteJobPostings, JobPosting, TimeSlot, RoleRequirement } from '../hooks/useJobPostings';
import { useDebounceSearch } from '../hooks/useDebounceSearch';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { prepareSearchTerms } from '../utils/searchUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import JobPostingSkeleton from '../components/JobPostingSkeleton';
import JobBoardErrorBoundary from '../components/JobBoardErrorBoundary';

const JobBoardPage = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError, showInfo, showWarning } = useToast();

  const [appliedJobs, setAppliedJobs] = useState<Map<string, string>>(new Map());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Debounced search
  const { searchTerm, debouncedSearchTerm, setSearchTerm } = useDebounceSearch(300);
  // Get current month as default
  const getCurrentMonth = () => {
    const now = new Date();
    return (now.getMonth() + 1).toString().padStart(2, '0');
  };

  // Filter states
  const [filters, setFilters] = useState({
    location: 'all',
    type: 'all',
    startDate: '',
    role: 'all',
    month: getCurrentMonth(), // Default to current month
    day: '' // Default to all days
  });
  
  // Prepare search terms and build dynamic filters
  const searchTerms = prepareSearchTerms(debouncedSearchTerm);
  const dynamicFilters = {
    ...filters,
    searchTerms: searchTerms.length > 0 ? searchTerms : undefined
  };
  
  // Infinite Query based data fetching
  const {
    data: infiniteData,
    isLoading: loading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useInfiniteJobPostings(dynamicFilters);
  
  // Flatten the infinite query data
  const jobPostings = useMemo(() => {
    return infiniteData?.pages.flatMap((page: any) => page.jobs) || [];
  }, [infiniteData]);
  
  // Infinite scroll hook
  const { loadMoreRef } = useInfiniteScroll({
    hasNextPage: hasNextPage || false,
    isFetchingNextPage,
    fetchNextPage
  });
  
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<JobPosting | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<{ timeSlot: string, role: string } | null>(null);
    
  useEffect(() => {
    if (!currentUser || !jobPostings) return;
    const fetchAppliedJobs = async () => {
      if (!currentUser || !jobPostings) return;
      const postIds = jobPostings.map(p => p.id);
      if (postIds.length === 0) return;

      const q = query(collection(db, 'applications'), where('applicantId', '==', currentUser.uid), where('postId', 'in', postIds));
      const querySnapshot = await getDocs(q);
      const appliedMap = new Map<string, string>();
      querySnapshot.forEach(doc => {
        appliedMap.set(doc.data().postId, doc.data().status);
      });
      setAppliedJobs(appliedMap);
    };

    fetchAppliedJobs();
  }, [jobPostings, currentUser]);
  
  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const resetFilters = () => {
    setFilters({
      location: 'all',
      type: 'all',
      startDate: '',
      role: 'all',
      month: getCurrentMonth(), // Reset to current month
      day: '' // Reset to all days
    });
  };

  // Date filter handler for month/day dropdowns
  const handleDateFilterChange = (type: 'month' | 'day', value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [type]: value };
      
      // When month or day changes, update startDate accordingly
      if (newFilters.month && newFilters.day) {
        newFilters.startDate = `2025-${newFilters.month}-${newFilters.day}`;
      } else {
        newFilters.startDate = '';
      }
      
      // If month is cleared, also clear day
      if (type === 'month' && !value) {
        newFilters.day = '';
        newFilters.startDate = '';
      }
      
      return newFilters;
    });
  };

  const formatDate = (dateInput: any) => {
    if (!dateInput) return '';
    
    try {
      let date: Date;
      
      // Handle Firebase Timestamp object
      if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput) {
        // Firebase Timestamp object
        date = new Date(dateInput.seconds * 1000);
      } else if (dateInput instanceof Date) {
        // Already a Date object
        date = dateInput;
      } else if (typeof dateInput === 'string') {
        // String date
        date = new Date(dateInput);
      } else {
        console.warn('Unknown date format:', dateInput);
        return String(dateInput); // Convert to string as fallback
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateInput);
        return String(dateInput); // Convert to string as fallback
      }
      
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      // Get day of week with fallback
      const dayOfWeekIndex = date.getDay();
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dayOfWeek = dayNames[dayOfWeekIndex] || '?';
      
      return `${year}-${month}-${day}(${dayOfWeek})`;
    } catch (error) {
      console.error('Error formatting date:', error, dateInput);
      return String(dateInput); // Convert to string as fallback
    }
  };

  const handleOpenApplyModal = (post: JobPosting) => {
    setSelectedPost(post);
    setIsApplyModalOpen(true);
    setSelectedAssignment(null);
  };
  
  const handleApply = async () => {
    if (!currentUser) {
      showError(t('jobBoard.alerts.loginRequired'));
      return;
    }
    if (!selectedPost || !selectedAssignment) {
        showWarning(t('jobBoard.alerts.selectAssignment'));
        return;
    }

    setIsProcessing(selectedPost.id);
    try {
      const staffDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if(!staffDoc.exists()){
        showError(t('jobBoard.alerts.profileNotFound'));
        return;
      }
      
      await addDoc(collection(db, 'applications'), {
        applicantId: currentUser.uid,
        applicantName: staffDoc.data().name || t('jobBoard.unknownApplicant'),
        postId: selectedPost.id,
        postTitle: selectedPost.title,
        status: 'applied',
        appliedAt: serverTimestamp(),
        assignedRole: selectedAssignment.role,
        assignedTime: selectedAssignment.timeSlot,
      });

      showSuccess(t('jobBoard.alerts.applicationSuccess'));
      setAppliedJobs(prev => new Map(prev).set(selectedPost.id, 'applied'));
      setIsApplyModalOpen(false);
      setSelectedPost(null);

    } catch (error) {
      console.error("Error submitting application: ", error);
      showError(t('jobBoard.alerts.applicationFailed'));
    } finally {
        setIsProcessing(null);
    }
  };

  const handleCancelApplication = async (postId: string) => {
      if (!currentUser) {
        showError(t('jobBoard.alerts.loginRequired'));
        return;
      }

      if (window.confirm(t('jobBoard.alerts.confirmCancel'))) {
          setIsProcessing(postId);
          try {
              const q = query(collection(db, 'applications'), where('applicantId', '==', currentUser.uid), where('postId', '==', postId));
              const querySnapshot = await getDocs(q);
              
              const deletePromises: Promise<void>[] = [];
              querySnapshot.forEach((document) => {
                  deletePromises.push(deleteDoc(doc(db, 'applications', document.id)));
              });
              await Promise.all(deletePromises);

              showSuccess(t('jobBoard.alerts.cancelSuccess'));
              setAppliedJobs(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(postId);
                  return newMap;
              });
          } catch (error) {
              console.error("Error cancelling application: ", error);
              showError(t('jobBoard.alerts.cancelFailed'));
          } finally {
              setIsProcessing(null);
          }
      }
  };

  const handleRunMigrations = async () => {
    if (!window.confirm('기존 공고 데이터를 업데이트하시겠습니까? (requiredRoles 필드 및 날짜 형식 변환)')) {
      return;
    }
    
    setIsProcessing('migration');
    try {
      await runJobPostingsMigrations();
      showSuccess('데이터 마이그레이션이 완료되었습니다. 페이지를 새로고침해주세요.');
    } catch (error) {
      console.error('Migration failed:', error);
      showError('마이그레이션 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4">
        <h1 className="text-2xl font-bold mb-4">{t('jobBoard.title')}</h1>
        <JobPostingSkeleton count={5} />
      </div>
    );
  }

  return (
    <JobBoardErrorBoundary>
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4">
        <h1 className="text-2xl font-bold mb-4">{t('jobBoard.title')}</h1>
      
        {/* Error Handling */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex">
              <div className="py-1">
                <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold">데이터 로딩 오류</p>
                <p className="text-sm">
                  {error.message?.includes('index') || error.message?.includes('Index') 
                    ? 'Firebase 인덱스 설정이 필요합니다. 관리자에게 문의하세요.'
                    : error.message?.includes('permission')
                    ? '권한이 없습니다. 로그인 상태를 확인해 주세요.'
                    : error.message?.includes('network')
                    ? '네트워크 연결을 확인해 주세요.'
                    : '데이터를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.'}
                </p>
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-red-600 hover:text-red-800">기술적 세부사항</summary>
                  <pre className="text-xs mt-1 bg-red-50 p-2 rounded overflow-auto">{error.message || 'Unknown error'}</pre>
                </details>
              </div>
            </div>
          </div>
        )}
      
        {/* Search Component */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <div className="max-w-md">
            <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
              {t('jobBoard.search.label', '검색')}
            </label>
            <input
              type="text"
              id="search-input"
              placeholder={t('jobBoard.search.placeholder', '제목이나 설명에서 검색...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {debouncedSearchTerm && (
              <p className="text-sm text-gray-500 mt-1">
                "{debouncedSearchTerm}" 검색 중...
              </p>
            )}
          </div>
        </div>
      
        {/* Filter Component */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location Filter */}
            <div>
              <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700 mb-1">
                {t('jobBoard.filters.location')}
              </label>
              <select
                id="location-filter"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">{t('jobBoard.filters.allLocations')}</option>
                <option value="서울">서울</option>
                <option value="경기">경기</option>
                <option value="인천">인천</option>
                <option value="강원">강원</option>
                <option value="대전">대전</option>
                <option value="세종">세종</option>
                <option value="충남">충남</option>
                <option value="충북">충북</option>
                <option value="광주">광주</option>
                <option value="전남">전남</option>
                <option value="전북">전북</option>
                <option value="대구">대구</option>
                <option value="경북">경북</option>
                <option value="부산">부산</option>
                <option value="울산">울산</option>
                <option value="경남">경남</option>
                <option value="제주">제주</option>
                <option value="해외">해외</option>
                <option value="기타">기타</option>
              </select>
            </div>
          
            {/* Type Filter */}
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                {t('jobBoard.filters.type')}
              </label>
              <select
                id="type-filter"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">{t('jobBoard.filters.allTypes')}</option>
                <option value="application">{t('jobPostingAdmin.create.typeApplication')}</option>
                <option value="fixed">{t('jobPostingAdmin.create.typeFixed')}</option>
              </select>
            </div>
          
            {/* Date Filter - Month/Day Dropdowns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('jobBoard.filters.startDate')}
              </label>
              <div className="flex space-x-2">
                {/* Month Dropdown */}
                <select
                  value={filters.month || ''}
                  onChange={(e) => handleDateFilterChange('month', e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                >
                  <option value="">전체</option>
                  <option value="01">1월</option>
                  <option value="02">2월</option>
                  <option value="03">3월</option>
                  <option value="04">4월</option>
                  <option value="05">5월</option>
                  <option value="06">6월</option>
                  <option value="07">7월</option>
                  <option value="08">8월</option>
                  <option value="09">9월</option>
                  <option value="10">10월</option>
                  <option value="11">11월</option>
                  <option value="12">12월</option>
                </select>
                
                {/* Day Dropdown */}
                <select
                  value={filters.day || ''}
                  onChange={(e) => handleDateFilterChange('day', e.target.value)}
                  disabled={!filters.month}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm disabled:bg-gray-100"
                >
                  <option value="">전체</option>
                  {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                    <option key={day} value={day.toString().padStart(2, '0')}>
                      {day}일
                    </option>
                  ))}
                </select>
              </div>
              {filters.month && filters.day && (
                <p className="text-xs text-gray-500 mt-1">
                  {parseInt(filters.month)}월 {parseInt(filters.day)}일
                </p>
              )}
            </div>
          
            {/* Role Filter */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                {t('jobBoard.filters.role')}
              </label>
              <select
                id="role"
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">{t('jobBoard.filters.allRoles')}</option>
                <option value="dealer">{t('roles.dealer')}</option>
                <option value="floor">{t('roles.floor')}</option>
                <option value="serving">{t('roles.serving')}</option>
                <option value="tournament_director">{t('roles.tournament_director')}</option>
                <option value="chip_master">{t('roles.chip_master')}</option>
                <option value="registration">{t('roles.registration')}</option>
                <option value="security">{t('roles.security')}</option>
                <option value="cashier">{t('roles.cashier')}</option>
              </select>
            </div>
          </div>
        
          {/* Reset Button and Migration Button */}
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={handleRunMigrations}
              disabled={isProcessing === 'migration'}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-400"
            >
              {isProcessing === 'migration' ? '마이그레이션 중...' : '데이터 업데이트'}
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {t('jobBoard.filters.reset')}
            </button>
          </div>
        </div>

        {/* Job Postings List */}
        <div className="space-y-4">
          {jobPostings?.map((post) => {
            const formattedStartDate = formatDate(post.startDate);
            const applicationStatus = appliedJobs.get(post.id);

            return (
              <div key={post.id} className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                  <div className="flex-grow">
                    <div className="flex items-center mb-2">
                      <h2 className="text-xl font-bold mr-4">{post.title}</h2>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800`}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">
                      {t('jobPostingAdmin.manage.location')}: {post.location}
                    </p>
                    <p className="text-sm text-gray-500 mb-1">
                      {t('jobPostingAdmin.manage.date')}: {formattedStartDate}
                    </p>
                    {post.timeSlots?.map((ts: TimeSlot, index: number) => (
                      <div key={index} className="mt-2 pl-4 border-l-2 border-gray-200">
                        <p className="text-sm font-semibold text-gray-700">{t('jobPostingAdmin.manage.time')}: {ts.time}</p>
                        <div className="text-sm text-gray-600">
                          {ts.roles.map((r: RoleRequirement, i: number) => (
                            <span key={i} className="mr-4">{t(`jobPostingAdmin.create.${r.name}`, r.name)}: {r.count}{t('jobPostingAdmin.manage.people')}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-sm text-gray-500 mt-2">
                      {t('jobPostingAdmin.create.description')}: {post.description}
                    </p>
                  </div>
                  <div className='flex flex-col items-end space-y-2'>
                    <button
                      onClick={() => showInfo('Detailed view not implemented yet.')}
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {t('jobBoard.viewDetails')}
                    </button>
                    {applicationStatus ? (
                      applicationStatus === 'confirmed' ? (
                        <button
                          disabled
                          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-500 cursor-not-allowed"
                        >
                          {t('jobBoard.confirmed', 'Confirmed')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelApplication(post.id)}
                          disabled={isProcessing === post.id}
                          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                        >
                          {isProcessing === post.id ? t('jobBoard.cancelling', 'Cancelling...') : t('jobBoard.cancelApplication', 'Cancel Application')}
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleOpenApplyModal(post)}
                        disabled={isProcessing === post.id}
                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {isProcessing === post.id ? t('jobBoard.applying') : t('jobBoard.applyNow')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Apply Modal */}
        {isApplyModalOpen && selectedPost && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">{t('jobBoard.applyModal.title', { postTitle: selectedPost.title })}</h3>
              <div>
                <label htmlFor="assignment" className="block text-sm font-medium text-gray-700">{t('jobBoard.applyModal.selectAssignment')}</label>
                <select
                  id="assignment"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={selectedAssignment ? `${selectedAssignment.timeSlot}__${selectedAssignment.role}` : ''}
                  onChange={(e) => {
                    const [timeSlot, role] = e.target.value.split('__');
                    setSelectedAssignment({ timeSlot, role });
                  }}
                >
                  <option value="" disabled>{t('jobBoard.applyModal.selectPlaceholder')}</option>
                  {selectedPost.timeSlots?.flatMap((ts: TimeSlot) => 
                    ts.roles.map((r: RoleRequirement) => {
                      const value = `${ts.time}__${r.name}`;
                      const confirmedCount = selectedPost.confirmedStaff?.filter(staff => staff.timeSlot === ts.time && staff.role === r.name).length || 0;
                      const isFull = confirmedCount >= r.count;
                      return (
                        <option key={value} value={value} disabled={isFull}>
                          {ts.time} - {t(`jobPostingAdmin.create.${r.name}`, r.name)} ({isFull ? t('jobBoard.applyModal.full') : `${confirmedCount}/${r.count}`})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
              <div className="flex justify-end mt-4 space-x-2">
                <button 
                  onClick={() => setIsApplyModalOpen(false)} 
                  className="py-3 px-6 sm:py-2 sm:px-4 bg-gray-500 text-white rounded hover:bg-gray-700 min-h-[48px] text-sm sm:text-base"
                >
                  {t('jobBoard.applyModal.cancel')}
                </button>
                <button 
                  onClick={handleApply} 
                  disabled={!selectedAssignment || isProcessing === selectedPost.id} 
                  className="py-3 px-6 sm:py-2 sm:px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 min-h-[48px] text-sm sm:text-base"
                >
                  {isProcessing ? t('jobBoard.applying') : t('jobBoard.applyModal.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Infinite Scroll Loading Indicator */}
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage && (
            <LoadingSpinner size="md" text="추가 공고를 불러오는 중..." />
          )}
          {!hasNextPage && jobPostings.length > 0 && (
            <p className="text-gray-500 text-center py-4">
              더 이상 공고가 없습니다.
            </p>
          )}
        </div>
      </div>
    </JobBoardErrorBoundary>
  );
};

export default JobBoardPage;