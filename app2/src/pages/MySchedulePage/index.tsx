import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { logger } from '../../utils/logger';
import { ApplicationHistoryService } from '../../services/ApplicationHistoryService';
import { 
  FaCalendarAlt, 
  FaSync,
  FaList,
  FaClock,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle
} from '../../components/Icons/ReactIconsReplacement';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { formatTime } from '../../utils/dateUtils';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useScheduleData } from '../../hooks/useUnifiedData';
import { CalendarView, ScheduleEvent, ATTENDANCE_STATUS_COLORS } from '../../types/schedule';
import { getTodayString } from '../../utils/jobPosting/dateUtils';
import { prepareWorkLogForCreate, prepareWorkLogForUpdate } from '../../utils/workLogMapper';
import { WorkLogCreateInput } from '../../types/unified/workLog';

// 스타일 임포트

// 컴포넌트 임포트
import ScheduleCalendar from './components/ScheduleCalendar';
import ScheduleDetailModal from './components/ScheduleDetailModal';
import ScheduleFilters from './components/ScheduleFilters';
import ScheduleStats from './components/ScheduleStats';
import LoadingSpinner from '../../components/LoadingSpinner';

// Firebase 함수
import { doc, updateDoc, deleteDoc, Timestamp, collection, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const MySchedulePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');


  // 상태 아이콘 렌더링
  const renderStatusIcon = (event: ScheduleEvent) => {
    switch (event.type) {
      case 'applied':
        return <FaHourglassHalf className="w-4 h-4 text-yellow-500" />;
      case 'confirmed':
        return <FaCheckCircle className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <FaCheckCircle className="w-4 h-4 text-blue-500" />;
      case 'cancelled':
        return <FaTimesCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  // 캘린더 뷰 상태
  const [calendarView, setCalendarView] = useState<CalendarView>('dayGridMonth');
  
  // 뷰 모드 상태 (모바일에서 사용)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
  // 모달 상태
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // 데이터 가져오기 (현재 사용자의 스케줄만)
  const {
    schedules,
    loading,
    error,
    stats,
    filters,
    setFilters,
    refreshData
  } = useScheduleData(currentUser?.uid ? {
    userId: currentUser.uid
  } : undefined);

  // VirtualListItem은 핸들러들이 정의된 후에 정의됩니다
  
  // 스케줄 데이터 디버깅
  useEffect(() => {
    logger.debug('\n🎯 ========== MySchedulePage 렌더링 ==========', { component: 'index' });
    logger.debug('현재 스케줄 수:', { component: 'index', data: schedules.length });
    logger.debug('로딩 상태:', { component: 'index', data: loading });
    logger.debug('에러:', { component: 'index', data: error });
    logger.debug('필터:', { component: 'index', data: filters });
    logger.debug('통계:', { component: 'index', data: stats });
    logger.debug('사용자 ID:', { component: 'index', data: currentUser?.uid });
    
    if (schedules.length > 0) {
      logger.debug('스케줄 샘플:', { component: 'index' });
      schedules.slice(0, 3).forEach((schedule, index) => {
        logger.debug(`  [${index}]`, { component: 'index', data: {
          id: schedule.id,
          date: schedule.date,
          eventName: schedule.eventName,
          type: schedule.type,
          status: schedule.status,
          sourceCollection: schedule.sourceCollection
        } });
      });
    }
    logger.debug('========================================\n', { component: 'index' });
  }, [schedules, loading, error, filters, stats, currentUser?.uid]);

  // 이벤트 클릭 핸들러 (메모이제이션)
  const handleEventClick = useCallback((event: ScheduleEvent) => {
    setSelectedSchedule(event);
    setIsDetailModalOpen(true);
  }, []);



  // 퇴근 처리 (메모이제이션)
  const handleCheckOut = useCallback(async (scheduleId: string) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule || !schedule.workLogId) {
        throw new Error('스케줄 정보를 찾을 수 없습니다.');
      }

      // workLogs 업데이트 - 통합 시스템 사용
      const updateData = prepareWorkLogForUpdate({
        actualEndTime: Timestamp.now(),
        status: 'completed' // checked_out 대신 completed 사용
      });
      await updateDoc(doc(db, 'workLogs', schedule.workLogId), updateData);

      showSuccess('퇴근 처리되었습니다.');
      logger.debug('✅ 퇴근 처리 완료:', { component: 'index', data: scheduleId });
    } catch (error) {
      logger.error('❌ 퇴근 처리 오류:', error instanceof Error ? error : new Error(String(error)), { component: 'index' });
      showError('퇴근 처리 중 오류가 발생했습니다.');
    }
  }, [schedules, showSuccess, showError]);


  // 지원 취소 (ApplicationHistory 서비스 연동)
  const handleCancelApplication = async (scheduleId: string) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule || !schedule.applicationId) {
        throw new Error('지원 정보를 찾을 수 없습니다.');
      }

      logger.debug('🔄 MySchedulePage 지원 취소 시작:', {
        component: 'MySchedulePage', 
        data: {
          scheduleId,
          applicationId: schedule.applicationId,
          eventName: schedule.eventName,
          type: schedule.type,
          status: schedule.status
        }
      });

      // ApplicationHistory 서비스를 통한 지원 취소 (데이터 일관성 보장)
      await ApplicationHistoryService.cancelApplication(schedule.applicationId);

      showSuccess('지원이 취소되었습니다.');
      logger.debug('✅ MySchedulePage 지원 취소 완료:', { 
        component: 'MySchedulePage', 
        data: { 
          scheduleId, 
          applicationId: schedule.applicationId,
          eventName: schedule.eventName
        } 
      });
      
      // 🔄 자동 새로고침으로 즉시 UI 업데이트
      refreshData();
      
    } catch (error) {
      logger.error('❌ MySchedulePage 지원 취소 오류:', 
        error instanceof Error ? error : new Error(String(error)), 
        { 
          component: 'MySchedulePage',
          data: { scheduleId }
        }
      );
      showError('지원 취소 중 오류가 발생했습니다.');
    }
  };

  // 일정 삭제 (미완료 일정만)
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) {
        throw new Error('스케줄 정보를 찾을 수 없습니다.');
      }

      logger.debug('🗑️ 일정 삭제 시작:', { component: 'index', data: {
        scheduleId,
        eventName: schedule.eventName,
        type: schedule.type,
        status: schedule.status,
        sourceCollection: schedule.sourceCollection
      } });

      // 삭제 가능한 일정인지 확인 (완료된 일정은 삭제 불가)
      if (schedule.type === 'completed') {
        showError('완료된 일정은 삭제할 수 없습니다.');
        return;
      }

      // 이미 출근한 일정은 삭제 제한 (선택적)
      if (schedule.status === 'checked_in') {
        showError('이미 출근한 일정은 삭제할 수 없습니다.');
        return;
      }

      // 사용자 확인
      const confirmed = window.confirm(`"${schedule.eventName}" 일정을 삭제하시겠습니까?\n\n삭제된 일정은 복구할 수 없습니다.`);
      if (!confirmed) {
        logger.debug('ℹ️ 사용자가 삭제를 취소했습니다.', { component: 'index' });
        return;
      }

      // 소스 컬렉션에 따른 삭제 처리
      if (schedule.sourceCollection === 'applications' && schedule.applicationId) {
        // applications: 완전 삭제
        await deleteDoc(doc(db, 'applications', schedule.applicationId));
        logger.debug('✅ applications 문서 삭제 완료:', { component: 'index', data: schedule.applicationId });
        
      } else if (schedule.sourceCollection === 'workLogs' && schedule.workLogId) {
        // workLogs: 이력 보존을 위해 상태만 변경
        await updateDoc(doc(db, 'workLogs', schedule.workLogId), {
          status: 'cancelled',
          cancelledAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        logger.debug('✅ workLogs 상태 변경 완료:', { component: 'index', data: schedule.workLogId });
        
      } else if (schedule.sourceCollection === 'staff' && schedule.sourceId) {
        // staff: 해당 일정 정보만 제거 (전체 문서는 보존)
        // 실제 구현은 staff 문서 구조에 따라 달라질 수 있음
        logger.debug('⚠️ staff 컬렉션 삭제는 추가 구현이 필요합니다:', { component: 'index', data: schedule.sourceId });
        showError('직원 일정 삭제는 관리자에게 문의하세요.');
        return;
        
      } else {
        throw new Error('지원되지 않는 일정 타입입니다.');
      }

      showSuccess('일정이 삭제되었습니다.');
      logger.debug('✅ 일정 삭제 완료:', { component: 'index', data: {
        scheduleId,
        eventName: schedule.eventName,
        sourceCollection: schedule.sourceCollection
      } });

    } catch (error) {
      logger.error('❌ 일정 삭제 오류:', error instanceof Error ? error : new Error(String(error)), { component: 'index' });
      showError('일정 삭제 중 오류가 발생했습니다.');
    }
  };

  // 가상화된 리스트 아이템 컴포넌트 (React.memo로 최적화)
  const VirtualListItem = useMemo(() => 
    React.memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
      const schedule = schedules[index];
      if (!schedule) return null;
      
      const isToday = schedule.date === getTodayString();
      const statusColorClass = ATTENDANCE_STATUS_COLORS[schedule.status];
      
      return (
        <div style={style}>
          <div
            key={schedule.id}
            onClick={() => handleEventClick(schedule)}
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${
              isToday ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                {renderStatusIcon(schedule)}
                <h4 className="font-semibold text-gray-900 truncate">
                  {schedule.eventName}
                </h4>
                {isToday && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                    오늘
                  </span>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColorClass}`}>
                {schedule.status === 'not_started' && '예정'}
                {schedule.status === 'checked_in' && '출근'}
                {schedule.status === 'checked_out' && '퇴근'}
              </span>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-gray-400 w-3 h-3" />
                <span>
                  {new Date(schedule.date).toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <FaClock className="text-gray-400 w-3 h-3" />
                <span>
                  {formatTime(schedule.startTime, { defaultValue: '미정' })} - {formatTime(schedule.endTime, { defaultValue: '미정' })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-gray-400 w-3 h-3" />
                <span>{schedule.role}</span>
              </div>

              {schedule.location && (
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-gray-400 w-3 h-3" />
                  <span className="truncate">{schedule.location}</span>
                </div>
              )}
            </div>

            {/* 오늘 일정인 경우 출퇴근 버튼 */}
            {isToday && schedule.type === 'confirmed' && (
              <div className="flex gap-2 mt-3">
                {schedule.status === 'checked_in' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckOut(schedule.id);
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    퇴근하기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }), 
  [schedules, getTodayString, handleEventClick, handleCheckOut]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="container max-w-7xl">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 스케줄</h1>
            <p className="text-gray-600 mt-1">근무 일정을 확인하고 관리하세요</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 뷰 토글 버튼 (모바일) */}
            {isMobile && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'calendar' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  title="캘린더 뷰"
                >
                  <FaCalendarAlt className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  title="리스트 뷰"
                >
                  <FaList className="w-5 h-5" />
                </button>
              </div>
            )}
            
            
            {/* 새로고침 버튼 */}
            <button
              onClick={refreshData}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="새로고침"
            >
              <FaSync className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 통계 */}
        <ScheduleStats stats={stats} isMobile={isMobile} />
      </div>

      {/* 필터 */}
      <div className="mb-4">
        <ScheduleFilters 
          filters={filters} 
          onFiltersChange={setFilters}
          isMobile={isMobile}
        />
      </div>

      {/* 메인 콘텐츠 */}
      {isMobile && viewMode === 'list' ? (
        /* 모바일 가상화 리스트 뷰 */
        <div className="bg-white rounded-lg shadow-sm">
          {schedules.length === 0 ? (
            <div className="p-8 text-center">
              <FaCalendarAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">등록된 일정이 없습니다.</p>
            </div>
          ) : (
            <div style={{ height: '60vh', minHeight: '400px' }}>
              <List
                height={Math.min(schedules.length * 150, window.innerHeight * 0.6)}
                width="100%"
                itemCount={schedules.length}
                itemSize={150}
                overscanCount={5}
              >
                {VirtualListItem}
              </List>
            </div>
          )}
        </div>
      ) : (
        /* 캘린더 뷰 */
        <ScheduleCalendar
          schedules={schedules}
          currentView={calendarView}
          onViewChange={setCalendarView}
          onEventClick={handleEventClick}
        />
      )}

      {/* 일정 상세 모달 */}
      <ScheduleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSchedule(null);
        }}
        schedule={selectedSchedule}
        onCheckOut={handleCheckOut}
        onCancel={handleCancelApplication}
        onDelete={handleDeleteSchedule}
      />

    </div>
  );
};

export default MySchedulePage;