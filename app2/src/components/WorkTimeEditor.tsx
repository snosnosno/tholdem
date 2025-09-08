import { doc, Timestamp, getDoc, runTransaction } from 'firebase/firestore';
import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SaveIcon, TimesIcon, EditIcon } from './Icons';

import { db } from '../firebase';
import { useToast } from '../hooks/useToast';
import { parseToDate } from '../utils/jobPosting/dateUtils';
import { useAttendanceStatus } from '../hooks/useAttendanceStatus';
import { calculateMinutes, formatMinutesToTime } from '../utils/timeUtils';
import { parseTimeToString, parseTimeToTimestamp } from '../utils/workLogMapper';
import { useUnifiedData } from '../hooks/useUnifiedData';
import type { WorkLog } from '../types/unifiedData';

import Modal from './ui/Modal';

// WorkTimeEditor에서 사용할 WorkLog 타입 (Firebase에서 가져온 실제 데이터 또는 가상 데이터)
interface WorkLogWithTimestamp {
  id: string;
  eventId: string;
  staffId: string;
  staffName?: string;
  date: string;
  role?: string;
  assignedRole?: string;  // 지원자에서 확정된 역할
  assignedTime?: string;  // 지원자에서 확정된 시간
  assignedDate?: string;  // 지원자에서 확정된 날짜
  scheduledStartTime: Timestamp | Date | null;
  scheduledEndTime: Timestamp | Date | null;
  actualStartTime: Timestamp | Date | null;
  actualEndTime: Timestamp | Date | null;
  status?: string;  // 출석 상태
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface WorkTimeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  workLog: WorkLogWithTimestamp | null;
  onUpdate?: (updatedWorkLog: WorkLogWithTimestamp) => void;
}

const WorkTimeEditor: React.FC<WorkTimeEditorProps> = ({
  isOpen,
  onClose,
  workLog,
  onUpdate
}) => {
  const { t: _t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { updateWorkLogOptimistic } = useUnifiedData();
  useAttendanceStatus({
    ...(workLog?.eventId && { eventId: workLog.eventId }),
    ...(workLog?.date && { date: workLog.date })
  });
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // formatTimeForInput은 이미 utils/dateUtils에서 import됨

  // 유효성 검사
  const validateTimes = () => {
    const errors: string[] = [];
    
    // 시작시간 유효성 검사
    if (startTime && startTime.trim() !== '' && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
      errors.push('시작 시간 형식이 올바르지 않습니다.');
    }
    
    // 종료시간 유효성 검사 (선택사항)
    if (endTime && endTime.trim() !== '' && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
      errors.push('종료 시간 형식이 올바르지 않습니다.');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // 시간 수정 함수
  const handleUpdateTime = async () => {
    
    if (!workLog) {
      showError('작업 로그 정보가 없습니다.');
      return;
    }
    
    const isValid = validateTimes();
    
    if (!isValid) {
      // 유효성 검사 실패
      return;
    }
    
    setIsUpdating(true);
    try {
      // workLog.date를 기반으로 baseDate 설정 (공고에 등록된 날짜 사용)
      // workLog.date를 사용하여 시간 파싱
      
      // 화면에 표시된 시간을 그대로 저장 (사용자가 수정하지 않아도)
      const newStartTime = startTime && startTime.trim() !== '' ? 
        parseTimeToTimestamp(startTime, workLog.date) : null;
      const newEndTime = endTime && endTime.trim() !== '' ? 
        parseTimeToTimestamp(endTime, workLog.date) : null;
      
      
      // 🚀 1단계: Optimistic Update - 즉시 UI 반영
      const optimisticWorkLog: Partial<WorkLog> = {
        id: workLog.id,
        eventId: workLog.eventId,
        staffId: workLog.staffId,
        staffName: workLog.staffName || '',
        date: workLog.date,
        status: (workLog.status || 'scheduled') as any,
        updatedAt: Timestamp.now()
      };
      
      // 조건부 필드 추가
      if (workLog.role) {
        optimisticWorkLog.role = workLog.role;
      }
      if (workLog.createdAt) {
        optimisticWorkLog.createdAt = workLog.createdAt;
      }
      
      // 조건부로 타임스탬프 필드 추가 (exactOptionalPropertyTypes 지원)
      if (startTime === '') {
        // 빈 문자열이면 scheduledStartTime 제거 (undefined로)
      } else if (startTime && startTime.trim() !== '' && newStartTime instanceof Timestamp) {
        optimisticWorkLog.scheduledStartTime = newStartTime;
      } else if (workLog.scheduledStartTime instanceof Timestamp) {
        optimisticWorkLog.scheduledStartTime = workLog.scheduledStartTime;
      }
      
      if (endTime === '') {
        // 빈 문자열이면 scheduledEndTime 제거 (undefined로)
      } else if (endTime && endTime.trim() !== '' && newEndTime instanceof Timestamp) {
        optimisticWorkLog.scheduledEndTime = newEndTime;
      } else if (workLog.scheduledEndTime instanceof Timestamp) {
        optimisticWorkLog.scheduledEndTime = workLog.scheduledEndTime;
      }
      
      if (workLog.actualStartTime instanceof Timestamp) {
        optimisticWorkLog.actualStartTime = workLog.actualStartTime;
      }
      if (workLog.actualEndTime instanceof Timestamp) {
        optimisticWorkLog.actualEndTime = workLog.actualEndTime;
      }
      
      // 🔥 assignedTime 필드도 추가 (UI에서 사용)
      if (startTime && startTime.trim() !== '') {
        optimisticWorkLog.assignedTime = startTime;
      }
      
      // UnifiedDataContext를 통한 즉시 UI 업데이트
      updateWorkLogOptimistic(optimisticWorkLog as WorkLog);
      
      
      // 🚀 2단계: Firebase 업데이트 (백그라운드 처리)
      const workLogRef = doc(db, 'workLogs', workLog.id);
      
      // 트랜잭션을 사용하여 원자적 업데이트 보장
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(workLogRef);
        
        if (!docSnap.exists()) {
          throw new Error(`WorkLog가 존재하지 않습니다. ID: ${workLog.id}`);
        }
        
        const updatePayload: any = {
          updatedAt: Timestamp.now()
        };
        
        // scheduled 시간만 업데이트 (actual 시간은 유지)
        if (startTime === '') {
          updatePayload.scheduledStartTime = null;
          updatePayload.assignedTime = null; // 🔥 assignedTime도 함께 업데이트
        } else if (startTime && startTime.trim() !== '') {
          updatePayload.scheduledStartTime = newStartTime;
          updatePayload.assignedTime = startTime; // 🔥 assignedTime도 함께 업데이트
        } else {
          updatePayload.scheduledStartTime = null;
          updatePayload.assignedTime = null; // 🔥 assignedTime도 함께 업데이트
        }
        
        if (endTime === '') {
          updatePayload.scheduledEndTime = null;
        } else if (endTime && endTime.trim() !== '') {
          updatePayload.scheduledEndTime = newEndTime;
        } else {
          updatePayload.scheduledEndTime = null;
        }
        
        // 기존 문서 업데이트 - actual 시간과 상태는 유지
        transaction.update(workLogRef, updatePayload);
      });
      
      
      // 🚀 3단계: 레거시 onUpdate 콜백 호출 (호환성 유지)
      if (onUpdate) {
        const updatedWorkLog = {
          ...workLog,
          scheduledStartTime: startTime === '' ? null : (startTime && startTime.trim() !== '' ? newStartTime : workLog.scheduledStartTime),
          scheduledEndTime: endTime === '' ? null : (endTime && endTime.trim() !== '' ? newEndTime : workLog.scheduledEndTime),
          updatedAt: Timestamp.now()
        };
        
        onUpdate(updatedWorkLog);
        
      }
      
      // 저장 후 Firebase에서 최신 데이터 다시 가져오기
      const finalWorkLogRef = doc(db, 'workLogs', workLog.id);
      const docSnap = await getDoc(finalWorkLogRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // UI 업데이트 - 정산 목적으로 예정시간 우선 표시
        const actualStartTimeString = parseTimeToString(data.actualStartTime);
        const scheduledStartTimeString = parseTimeToString(data.scheduledStartTime);
        const startTimeString = scheduledStartTimeString || actualStartTimeString || '';
        
        const scheduledEndTimeString = parseTimeToString(data.scheduledEndTime);
        const endTimeString = scheduledEndTimeString || '';
        
        setStartTime(startTimeString);
        setEndTime(endTimeString);
        
        const startParts = parseTime(startTimeString);
        setStartHour(startParts.hour);
        setStartMinute(startParts.minute);
        
        const endParts = parseTime(endTimeString);
        setEndHour(endParts.hour);
        setEndMinute(endParts.minute);
      }
      
      showSuccess('시간이 성공적으로 업데이트되었습니다.');
      
      // 🚀 즉시 동기화 - Firebase 저장과 동시에 Context 갱신
      // setTimeout 지연 제거: Firebase onSnapshot이 자동으로 동기화 처리
      
    } catch (error) {
      logger.error('시간 업데이트 중 오류 발생', error instanceof Error ? error : new Error(String(error)), { component: 'WorkTimeEditor' });
      
      // 🚀 4단계: 에러 발생 시 Optimistic Update 롤백
      const rollbackWorkLog: Partial<WorkLog> = {
        id: workLog.id,
        eventId: workLog.eventId,
        staffId: workLog.staffId,
        staffName: workLog.staffName || '',
        date: workLog.date,
        status: (workLog.status || 'scheduled') as any,
        updatedAt: workLog.updatedAt || Timestamp.now()
      };
      
      // 조건부 필드 추가 (rollback)
      if (workLog.role) {
        rollbackWorkLog.role = workLog.role;
      }
      if (workLog.createdAt) {
        rollbackWorkLog.createdAt = workLog.createdAt;
      }
      
      // 조건부로 원본 타임스탬프 필드 복원
      if (workLog.scheduledStartTime instanceof Timestamp) {
        rollbackWorkLog.scheduledStartTime = workLog.scheduledStartTime;
      }
      if (workLog.scheduledEndTime instanceof Timestamp) {
        rollbackWorkLog.scheduledEndTime = workLog.scheduledEndTime;
      }
      if (workLog.actualStartTime instanceof Timestamp) {
        rollbackWorkLog.actualStartTime = workLog.actualStartTime;
      }
      if (workLog.actualEndTime instanceof Timestamp) {
        rollbackWorkLog.actualEndTime = workLog.actualEndTime;
      }
      
      // 원래 상태로 롤백
      updateWorkLogOptimistic(rollbackWorkLog as WorkLog);
      
      
      showError('시간 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };


  // 모달이 열릴 때 기존 시간 값 설정
  useEffect(() => {
    if (!isOpen || !workLog) {
      return;
    }
    
    // 정산 목적으로 예정시간 우선, 없으면 assignedTime, 그다음 실제시간 사용
    // 표준화된 parseTimeToString 사용
    const actualStartTimeString = parseTimeToString(workLog.actualStartTime);
    const scheduledStartTimeString = parseTimeToString(workLog.scheduledStartTime);
    const startTimeString = scheduledStartTimeString || workLog.assignedTime || actualStartTimeString || '';
    
    // 퇴근시간은 예정시간(scheduledEndTime)만 사용
    const scheduledEndTimeString = parseTimeToString(workLog.scheduledEndTime);
    const endTimeString = scheduledEndTimeString || '';
    
    setStartTime(startTimeString);
    setEndTime(endTimeString);
    
    const startParts = parseTime(startTimeString);
    setStartHour(startParts.hour);
    setStartMinute(startParts.minute);
    
    const endParts = parseTime(endTimeString);
    setEndHour(endParts.hour);
    setEndMinute(endParts.minute);
    
    setValidationErrors([]);
    setHasChanges(false); // 초기 로드시 변경사항 없음
  }, [isOpen, workLog]); // workLog가 변경될 때마다 실행

  // 모달 제목 - 통합 편집 모드
  const getModalTitle = () => {
    return '근무 시간 수정';
  };

  // 시간과 분 옵션 생성
  const generateHourOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      options.push({
        value: hour.toString().padStart(2, '0'),
        label: `${hour.toString().padStart(2, '0')}시`
      });
    }
    return options;
  };

  const generateMinuteOptions = () => {
    const options = [];
    for (let minute = 0; minute < 60; minute += 5) {
      options.push({
        value: minute.toString().padStart(2, '0'),
        label: `${minute.toString().padStart(2, '0')}분`
      });
    }
    return options;
  };

  const hourOptions = generateHourOptions();
  const minuteOptions = generateMinuteOptions();

  // 시간 분리 함수
  const parseTime = (timeString: string) => {
    if (!timeString) return { hour: '', minute: '00' };
    const [hour, minute] = timeString.split(':');
    return { hour: hour || '', minute: minute || '00' };
  };

  const combineTime = (hour: string, minute: string) => {
    // 시간과 분이 모두 있을 때만 결합
    if (hour && minute) {
      return `${hour}:${minute}`;
    }
    // 둘 중 하나라도 없으면 빈 문자열 반환 (이는 '미정' 상태를 의미)
    return '';
  };

  // 시작 시간 분리
  const [startHour, setStartHour] = useState('');
  const [startMinute, setStartMinute] = useState('00');

  // 종료 시간 분리
  const [endHour, setEndHour] = useState('');
  const [endMinute, setEndMinute] = useState('00');

  // 시간 업데이트 핸들러 - UI만 업데이트
  const handleStartTimeChange = (hour: string, minute: string) => {
    setStartHour(hour);
    setStartMinute(minute);
    const newTime = combineTime(hour, minute);
    setStartTime(newTime);
    setHasChanges(true); // 변경사항 표시
  };

  const handleEndTimeChange = (hour: string, minute: string) => {
    setEndHour(hour);
    setEndMinute(minute);
    const newTime = combineTime(hour, minute);
    setEndTime(newTime);
    setHasChanges(true); // 변경사항 표시
  };


  if (!workLog) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
    >
      <div className="space-y-4">
        {/* 기본 정보 - 컴팩트하게 변경 */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800">
                  👤 {workLog.staffName || '이름 미정'}
                </span>
                <span className="text-sm text-gray-600">
                  • {workLog.assignedRole || workLog.role || '역할 미정'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                📅 {(() => {
                  try {
                    // 1. scheduledStartTime이 있으면 우선 사용
                    if (workLog.scheduledStartTime) {
                      const date = parseToDate(workLog.scheduledStartTime);
                      if (date) {
                        // 월과 일만 표시하여 더 간결하게
                        return date.toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short'
                        });
                      }
                    }
                    
                    // 2. workLog.date가 있으면 사용
                    if (workLog.date) {
                      const date = parseToDate(workLog.date);
                      if (date) {
                        return date.toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short'
                        });
                      }
                      // parseToDate가 실패한 경우 원본 값 표시
                      return String(workLog.date);
                    }
                    
                    return '날짜 정보 없음';
                  } catch (error) {
                    // Error displaying date
                    return workLog.date ? String(workLog.date) : '날짜 오류';
                  }
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* 시간 편집 */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h3 className="text-base font-semibold mb-2 flex items-center">
            <EditIcon className="w-4 h-4 mr-2 text-blue-600" />
            근무 시간 설정
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            시간을 선택하지 않으면 '미정'으로 표시됩니다.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                출근 시간
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <select
                    value={startHour}
                    onChange={(e) => handleStartTimeChange(e.target.value, startMinute)}
                    className="flex-1 px-2 py-1.5 border rounded-md font-mono text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">시</option>
                    {hourOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={startMinute}
                    onChange={(e) => handleStartTimeChange(startHour, e.target.value)}
                    className="flex-1 px-2 py-1.5 border rounded-md font-mono text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="00">00분</option>
                    {minuteOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* 시작시간 지우기 버튼 - 항상 표시 */}
                {startTime && (
                  <button
                    onClick={() => {
                      setStartHour('');
                      setStartMinute('');
                      setStartTime('');
                      setHasChanges(true);
                    }}
                    className="w-full px-2 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                    title="출근시간을 미정으로 설정"
                  >
                    출근 시간 미정
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                퇴근 시간
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <select
                    value={endHour}
                    onChange={(e) => handleEndTimeChange(e.target.value, endMinute)}
                    className="flex-1 px-2 py-1.5 border rounded-md font-mono text-sm border-gray-300 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">시</option>
                    {hourOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={endMinute}
                    onChange={(e) => handleEndTimeChange(endHour, e.target.value)}
                    className="flex-1 px-2 py-1.5 border rounded-md font-mono text-sm border-gray-300 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="00">00분</option>
                    {minuteOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setEndHour('');
                    setEndMinute('');
                    setEndTime('');
                    setHasChanges(true);
                  }}
                  className="w-full px-2 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  title="퇴근시간을 미정으로 설정"
                >
                  퇴근 시간 미정
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* 근무 시간 요약 */}
        <div className="bg-yellow-50 p-3 rounded-lg">
          <h3 className="text-base font-semibold mb-2">근무 시간 요약</h3>
          <div className="text-center">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              근무시간
            </label>
            <div className="text-base font-mono font-bold text-blue-600">
              {startTime ? (() => {
                if (endTime) {
                  // 시작/종료 시간 모두 있는 경우
                  const parsedStartTime = parseTimeToTimestamp(startTime, workLog?.date || '');
                  const parsedEndTime = parseTimeToTimestamp(endTime, workLog?.date || '');
                  const minutes = calculateMinutes(parsedStartTime, parsedEndTime);
                  
                  const startHour = parseInt(startTime.split(':')[0] || '0');
                  const endHour = parseInt(endTime.split(':')[0] || '0');
                  const isNextDay = endHour < startHour; // 다음날 여부 판단
                  
                  return (
                    <div>
                      <div>{formatMinutesToTime(minutes)}</div>
                      {isNextDay && (
                        <div className="text-xs text-orange-600 mt-1">
                          (다음날 {endTime}까지)
                        </div>
                      )}
                    </div>
                  );
                } else {
                  // 시작시간만 있는 경우
                  return (
                    <div>
                      <div className="text-sm">시작시간: {startTime}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        (종료시간 미정)
                      </div>
                    </div>
                  );
                }
              })() : (
                <div>
                  <div className="text-sm text-gray-500">시간 미정</div>
                  <div className="text-xs text-gray-400 mt-1">
                    시작시간을 설정해주세요
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 유효성 검사 오류 */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">오류</h4>
            <ul className="list-disc list-inside text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
          >
            <TimesIcon className="w-4 h-4 mr-2" />
            닫기
          </button>
          <div className="flex space-x-3">
            <button
              onClick={async () => {
                await handleUpdateTime();
                setHasChanges(false);
                // 변경사항이 있었으면 모달 닫기
                if (hasChanges) {
                  onClose();
                }
                // 변경사항이 없으면 모달 유지
              }}
              disabled={isUpdating}
              className={`px-4 py-2 text-white rounded-md disabled:opacity-50 flex items-center font-medium transition-all ${
                hasChanges 
                  ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-400 ring-opacity-50' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              {isUpdating ? '저장 중...' : hasChanges ? '변경사항 저장' : '저장'}
            </button>
            {!hasChanges && (
              <button
                onClick={async () => {
                  await handleUpdateTime();
                  onClose();
                }}
                disabled={isUpdating}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center font-medium"
              >
                저장 후 닫기
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WorkTimeEditor;