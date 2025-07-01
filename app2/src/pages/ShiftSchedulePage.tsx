import React, { useState, useMemo, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { FaCalendarAlt, FaClock, FaUsers, FaTable, FaPlus, FaCog, FaTrash, FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaHistory } from 'react-icons/fa';
import { collection, query, doc, deleteField, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from 'react-i18next';
import { useShiftSchedule, ShiftDealer } from '../hooks/useShiftSchedule';
import useTables from '../hooks/useTables';
import TimeIntervalSelector from '../components/TimeIntervalSelector';
import ShiftGridComponent from '../components/ShiftGridComponent';

const ShiftSchedulePage: React.FC = () => {
  const { t } = useTranslation();
  
  // 현재 선택된 날짜 상태
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
  });
  
  // 임시 이벤트 ID (추후 이벤트 선택 기능으로 확장)
  const [selectedEventId] = useState<string>('default-event');
  
  // 기존 스태프 데이터 가져오기 (DealerRotationPage 패턴)
  const staffQuery = useMemo(() => query(collection(db, 'staff')), []);
  
  const [staffSnap, staffLoading] = useCollection(staffQuery);
  const { tables, loading: tablesLoading } = useTables();
  
  // 교대 스케줄 데이터
  const { 
    schedule, 
    loading: scheduleLoading, 
    error: scheduleError,
    timeSlots,
    dealers,
    validationResult,
    createSchedule,
    updateDealerAssignment,
    addDealer,
    updateScheduleSettings,
    generateWorkLogs,
    checkWorkLogsExist
  } = useShiftSchedule(selectedEventId, selectedDate);
  
  // 스태프 데이터 처리
  const allStaff = useMemo(() => 
    staffSnap?.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShiftDealer[] | undefined, 
    [staffSnap]
  );
  
  const availableDealers = useMemo(() =>
    (allStaff?.filter(s => s.role === 'Dealer') as ShiftDealer[] || []), 
    [allStaff]
  );
  
  // 스케줄에 이미 추가된 딜러들을 제외한 사용 가능한 딜러들
  const dealersNotInSchedule = useMemo(() => {
    if (!schedule) return availableDealers;
    const scheduledDealerIds = Object.keys(schedule.scheduleData);
    return availableDealers.filter(dealer => !scheduledDealerIds.includes(dealer.id));
  }, [availableDealers, schedule]);
  
  const loading = staffLoading || tablesLoading || scheduleLoading;
  
  // 근무기록 상태
  const [isGeneratingWorkLogs, setIsGeneratingWorkLogs] = useState(false);
  const [workLogsGenerated, setWorkLogsGenerated] = useState(false);
  
  // 설정 모달 상태
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  // 근무기록 생성 여부 확인
  useEffect(() => {
    const checkLogs = async () => {
      if (selectedEventId && selectedDate) {
        const exists = await checkWorkLogsExist();
        setWorkLogsGenerated(exists);
      }
    };
    checkLogs();
  }, [selectedEventId, selectedDate, checkWorkLogsExist]);
  
  // 날짜 변경 핸들러
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };
  
  // 딜러 추가 핸들러
  const handleAddDealer = async (dealerId: string, dealerName: string) => {
    if (!schedule) return;
    
    try {
      await addDealer(dealerId, dealerName, schedule.startTime);
    } catch (error) {
      console.error('Error adding dealer:', error);
    }
  };
  
  // 딜러 제거 핸들러 (스케줄에서 모든 할당 제거)
  const handleRemoveDealer = async (dealerId: string) => {
    if (!schedule) return;
    
    try {
      const scheduleId = `${selectedEventId}_${selectedDate}`;
      const scheduleRef = doc(db, 'shiftSchedules', scheduleId);
      await updateDoc(scheduleRef, {
        [`scheduleData.${dealerId}`]: deleteField(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing dealer:', error);
    }
  };
  
  // 근무기록 생성 핸들러
  const handleGenerateWorkLogs = async () => {
    if (!schedule || !selectedEventId || !selectedDate) {
      alert('스케줄 정보가 없습니다.');
      return;
    }

    if (workLogsGenerated) {
      const confirmed = window.confirm('이미 근무기록이 생성되었습니다. 다시 생성하시겠습니까?');
      if (!confirmed) return;
    }

    setIsGeneratingWorkLogs(true);
    try {
      const logs = await generateWorkLogs();
      setWorkLogsGenerated(true);
      alert(`${logs.length}개의 근무기록이 성공적으로 생성되었습니다.`);
    } catch (error) {
      console.error('Error generating work logs:', error);
      alert('근무기록 생성에 실패했습니다.');
    } finally {
      setIsGeneratingWorkLogs(false);
    }
  };
  
  // 사용자 확인 모달 (딜러 제거용)
  const confirmRemoveDealer = (dealerId: string, dealerName: string) => {
    if (window.confirm(`정말로 ${dealerName} 딜러를 스케줄에서 제거하시겠습니까?`)) {
      handleRemoveDealer(dealerId);
    }
  };
  
  // 새 스케줄 생성 핸들러
  const handleCreateSchedule = async () => {
    try {
      await createSchedule(selectedEventId, selectedDate);
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };
  
  // 시간 간격 변경 핸들러
  const handleIntervalChange = async (newInterval: number) => {
    if (!schedule) return;
    
    try {
      await updateScheduleSettings(newInterval);
    } catch (error) {
      console.error('Error updating interval:', error);
    }
  };
  
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('ko-KR', options);
  };
  
  // 검증 결과 컴포넌트
  const ValidationSummary = () => {
    if (!validationResult) return null;

    const errorCount = validationResult.violations.filter(v => v.severity === 'error').length;
    const warningCount = validationResult.violations.filter(v => v.severity === 'warning').length;
    const infoCount = validationResult.violations.filter(v => v.severity === 'info').length;

    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <FaCheckCircle className="mr-2 text-blue-600" />
          스케줄 검증 결과
        </h3>
        
        <div className="flex items-center gap-4 mb-3">
          {errorCount > 0 && (
            <div className="flex items-center text-red-600">
              <FaExclamationTriangle className="mr-1" />
              <span className="font-semibold">{errorCount}개 오류</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center text-yellow-600">
              <FaExclamationTriangle className="mr-1" />
              <span className="font-semibold">{warningCount}개 경고</span>
            </div>
          )}
          {infoCount > 0 && (
            <div className="flex items-center text-blue-600">
              <FaInfoCircle className="mr-1" />
              <span className="font-semibold">{infoCount}개 정보</span>
            </div>
          )}
          {validationResult.violations.length === 0 && (
            <div className="flex items-center text-green-600">
              <FaCheckCircle className="mr-1" />
              <span className="font-semibold">검증 통과</span>
            </div>
          )}
        </div>

        {validationResult.violations.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {validationResult.violations.map((violation, index) => (
              <div key={index} className={`text-sm p-2 rounded ${
                violation.severity === 'error' ? 'bg-red-50 text-red-700' :
                violation.severity === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                <span className="font-medium">{violation.type}:</span> {violation.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('shiftSchedule.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 헤더 섹션 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {t('shiftSchedule.title')}
        </h1>
        <p className="text-gray-600">{t('shiftSchedule.subtitle')}</p>
      </div>

      {/* 날짜 선택 및 컨트롤 바 */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* 날짜 선택 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-blue-600" />
              <label className="font-semibold text-gray-700">
                {t('shiftSchedule.selectDate')}:
              </label>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">({formatDate(selectedDate)})</span>
          </div>
          
          {/* 시간 간격 선택 */}
          {schedule && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FaClock className="text-purple-600" />
                <label className="font-semibold text-gray-700">
                  {t('shiftSchedule.timeInterval')}:
                </label>
              </div>
              <div className="w-64">
                <TimeIntervalSelector
                  selectedInterval={schedule.timeInterval}
                  onIntervalChange={handleIntervalChange}
                  startTime={schedule.startTime}
                  endTime={schedule.endTime}
                  size="sm"
                />
              </div>
            </div>
          )}
          
          {/* 컨트롤 버튼들 */}
          <div className="flex items-center gap-2">
            {schedule && dealers.length > 0 && (
              <button 
                onClick={handleGenerateWorkLogs}
                disabled={isGeneratingWorkLogs}
                className={`btn btn-sm flex items-center gap-2 ${
                  workLogsGenerated ? 'btn-outline' : 'btn-secondary'
                } ${isGeneratingWorkLogs ? 'loading' : ''}`}
              >
                <FaHistory className="w-4 h-4" />
                {isGeneratingWorkLogs ? '생성 중...' : 
                 workLogsGenerated ? '근무기록 재생성' : '근무기록 생성'}
              </button>
            )}
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="btn btn-outline btn-sm flex items-center gap-2"
            >
              <FaCog className="w-4 h-4" />
              {t('shiftSchedule.settings')}
            </button>
            {!schedule && (
              <button 
                onClick={handleCreateSchedule}
                className="btn btn-primary btn-sm flex items-center gap-2"
              >
                <FaPlus className="w-4 h-4" />
                {t('shiftSchedule.createSchedule')}
              </button>
            )}
          </div>
        </div>
        
        {/* 근무기록 상태 표시 */}
        {schedule && (
          <div className="mt-3 p-2 rounded-md">
            {workLogsGenerated ? (
              <div className="flex items-center gap-2 text-green-600">
                <FaCheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">이 날짜의 근무기록이 이미 생성되었습니다</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600">
                <FaHistory className="w-4 h-4" />
                <span className="text-sm font-medium">스케줄 완료 후 근무기록을 생성하세요</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 검증 결과 */}
      {schedule && <ValidationSummary />}

      {/* 메인 콘텐츠 영역 */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* 스케줄 그리드 영역 (3/4) */}
        <div className="xl:col-span-3">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-blue-600 flex items-center">
              <FaTable className="mr-2"/> 
              {t('shiftSchedule.scheduleGrid')}
              {schedule && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({schedule.timeInterval}분 간격)
                </span>
              )}
            </h2>
            
            {schedule ? (
              <div className="space-y-4">
                {/* 시간 슬롯 정보 */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FaClock className="w-4 h-4" />
                    <span>{schedule.startTime} - {schedule.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaUsers className="w-4 h-4" />
                    <span>{dealers.length}명 배정됨</span>
                  </div>
                </div>
                
                {/* 엑셀형 교대 스케줄 그리드 */}
                <ShiftGridComponent
                  dealers={dealers}
                  tables={tables}
                  timeSlots={timeSlots}
                  onCellChange={updateDealerAssignment}
                  readonly={false}
                  height={500}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <FaCalendarAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {t('shiftSchedule.noSchedule')}
                </h3>
                <p className="text-gray-500 mb-4">
                  {formatDate(selectedDate)} 일정이 아직 생성되지 않았습니다.
                </p>
                <button 
                  onClick={handleCreateSchedule}
                  className="btn btn-primary flex items-center gap-2 mx-auto"
                >
                  <FaPlus className="w-4 h-4" />
                  {t('shiftSchedule.createSchedule')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 사이드바 - 딜러 목록 및 정보 (1/4) */}
        <div className="space-y-6">
          {/* 현재 스케줄의 딜러들 */}
          {schedule && dealers.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-blue-600 flex items-center">
                <FaUsers className="mr-2"/> 
                배정된 딜러 ({dealers.length})
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {dealers.map(dealer => (
                  <div key={dealer.id} className="flex items-center bg-blue-50 p-3 rounded-lg shadow-sm">
                    <div className="w-8 h-8 bg-blue-300 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-semibold text-blue-700">
                        {dealer.dealerName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{dealer.dealerName}</p>
                      <p className="text-sm text-gray-500">출근시간: {dealer.startTime}</p>
                    </div>
                    <button 
                      onClick={() => confirmRemoveDealer(dealer.id, dealer.dealerName)}
                      className="btn btn-sm btn-outline btn-error"
                      title="스케줄에서 제거"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 사용 가능한 딜러 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-green-600 flex items-center">
              <FaUsers className="mr-2"/> 
              {t('shiftSchedule.availableDealers')} ({dealersNotInSchedule.length})
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {dealersNotInSchedule.map(dealer => (
                <div key={dealer.id} className="flex items-center bg-gray-50 p-3 rounded-lg shadow-sm">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-semibold text-gray-600">
                      {dealer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{dealer.name}</p>
                    <p className="text-sm text-gray-500">{dealer.role}</p>
                  </div>
                  {schedule && (
                    <button 
                      onClick={() => handleAddDealer(dealer.id, dealer.name)}
                      className="btn btn-sm btn-outline btn-success"
                    >
                      <FaPlus className="w-3 h-3 mr-1" />
                      {t('shiftSchedule.addToSchedule')}
                    </button>
                  )}
                </div>
              ))}
              {dealersNotInSchedule.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  {schedule ? '모든 딜러가 스케줄에 추가되었습니다' : t('shiftSchedule.noDealersAvailable')}
                </p>
              )}
            </div>
          </div>

          {/* 테이블 정보 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center">
              <FaTable className="mr-2"/> 
              {t('shiftSchedule.availableTables')} ({tables?.length || 0})
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tables?.map(table => (
                <div key={table.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium text-gray-700">
                    Table {table.tableNumber}
                  </span>
                  <span className="text-sm text-gray-500">
                    {table.status || 'open'}
                  </span>
                </div>
              ))}
              {(!tables || tables.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  {t('shiftSchedule.noTablesAvailable')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 에러 표시 */}
      {scheduleError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">
            {t('shiftSchedule.error')}: {scheduleError.message}
          </p>
        </div>
      )}
    </div>
    
    {/* 설정 모달 */}
    {isSettingsModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{t('shiftSchedule.settings')}</h3>
            <button 
              onClick={() => setIsSettingsModalOpen(false)}
              className="btn btn-sm btn-circle"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                기본 근무 시간 설정
              </label>
              <div className="text-sm text-gray-600">
                새로운 스케줄 생성 시 사용되는 기본 시간 설정입니다.
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                자동 저장 설정
              </label>
              <label className="cursor-pointer label">
                <span className="label-text text-sm">변경 사항 자동 저장</span>
                <input type="checkbox" className="checkbox checkbox-sm" defaultChecked />
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                알림 설정
              </label>
              <label className="cursor-pointer label">
                <span className="label-text text-sm">예약 충돌 알림</span>
                <input type="checkbox" className="checkbox checkbox-sm" defaultChecked />
              </label>
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <button 
              onClick={() => setIsSettingsModalOpen(false)}
              className="btn btn-outline flex-1"
            >
              취소
            </button>
            <button 
              onClick={() => {
                // TODO: 설정 저장 로직 추가
                setIsSettingsModalOpen(false);
              }}
              className="btn btn-primary flex-1"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ShiftSchedulePage;