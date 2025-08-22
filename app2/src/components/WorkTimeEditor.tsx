import { doc, updateDoc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SaveIcon, TimesIcon, EditIcon } from './Icons';

import { db } from '../firebase';
import { useToast } from '../hooks/useToast';
import { parseToDate } from '../utils/jobPosting/dateUtils';
import { useAttendanceStatus } from '../hooks/useAttendanceStatus';
import { calculateMinutes, formatMinutesToTime } from '../utils/timeUtils';
import { prepareWorkLogForCreate, prepareWorkLogForUpdate, parseTimeToString, parseTimeToTimestamp } from '../utils/workLogMapper';
import { WorkLogCreateInput } from '../types/unified/workLog';

import Modal from './ui/Modal';

// WorkTimeEditor에서 사용할 WorkLog 타입 (Firebase에서 가져온 실제 데이터 또는 가상 데이터)
interface WorkLogWithTimestamp {
  id: string;
  eventId: string;
  staffId: string;
  dealerId?: string; // @deprecated - staffId 사용 권장. 하위 호환성을 위해 유지
  date: string;
  scheduledStartTime: Timestamp | Date | null;
  scheduledEndTime: Timestamp | Date | null;
  actualStartTime: Timestamp | Date | null;
  actualEndTime: Timestamp | Date | null;
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
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
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

  // Timestamp 또는 Date를 Date로 변환하는 헬퍼 함수
  const toDate = (timestamp: Timestamp | Date | any | null): Date => {
    if (!timestamp) return new Date();
    
    const parsedDate = parseToDate(timestamp);
    return parsedDate || new Date(); // parseToDate가 null을 반환하면 현재 날짜 사용
  };

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
      logger.debug('handleUpdateTime - using workLog date:', { 
        component: 'WorkTimeEditor', 
        data: {
          workLogDate: workLog.date
        }
      });
      
      // 화면에 표시된 시간을 그대로 저장 (사용자가 수정하지 않아도)
      const newStartTime = startTime && startTime.trim() !== '' ? 
        parseTimeToTimestamp(startTime, workLog.date) : null;
      const newEndTime = endTime && endTime.trim() !== '' ? 
        parseTimeToTimestamp(endTime, workLog.date) : null;
      
      logger.debug('handleUpdateTime - parsed times:', { component: 'WorkTimeEditor', data: {
        startTime,
        endTime,
        newStartTime,
        newEndTime
      } });
      
      // 가상 WorkLog인지 확인 (ID가 'virtual_'로 시작하는 경우)
      const isVirtual = workLog.id.startsWith('virtual_');
      
      let finalWorkLogId = workLog.id;
      
      if (isVirtual) {
        // 가상 WorkLog의 경우 새로운 문서 생성
        const realWorkLogId = `${workLog.eventId}_${workLog.staffId}_${workLog.date}`;
        finalWorkLogId = realWorkLogId;
        const workLogRef = doc(db, 'workLogs', realWorkLogId);
        
        // 통합 시스템 사용
        const staffId = workLog.staffId || (workLog as any).dealerId || '';
        
        // 가상 WorkLog 저장 시 시간 값 우선순위:
        // 1. UI에 표시된 값 (startTime/endTime) - 이미 스태프탭에서 설정된 값
        // 2. 새로 파싱된 값 (newStartTime/newEndTime) 
        // 3. workLog의 기존 scheduledTime 값
        let finalStartTime = newStartTime;
        let finalEndTime = newEndTime;
        
        // 중요: UI에 표시된 값이 있으면 무조건 사용 (스태프탭 설정 우선)
        if (!finalStartTime && startTime && startTime.trim() !== '') {
          // startTime이 있으면 이를 파싱해서 사용
          finalStartTime = parseTimeToTimestamp(startTime, workLog.date);
          logger.debug('Using UI startTime for virtual WorkLog', { 
            component: 'WorkTimeEditor', 
            data: { startTime, finalStartTime } 
          });
        }
        
        if (!finalEndTime && endTime && endTime.trim() !== '') {
          // endTime이 있으면 이를 파싱해서 사용
          finalEndTime = parseTimeToTimestamp(endTime, workLog.date);
          logger.debug('Using UI endTime for virtual WorkLog', { 
            component: 'WorkTimeEditor', 
            data: { endTime, finalEndTime } 
          });
        }
        
        // 그래도 없으면 workLog의 기존 값 사용
        if (!finalStartTime && workLog.scheduledStartTime) {
          finalStartTime = workLog.scheduledStartTime instanceof Date ? 
            Timestamp.fromDate(workLog.scheduledStartTime) : 
            workLog.scheduledStartTime;
          logger.debug('Using existing scheduledStartTime', { 
            component: 'WorkTimeEditor', 
            data: { scheduledStartTime: workLog.scheduledStartTime } 
          });
        }
        
        if (!finalEndTime && workLog.scheduledEndTime) {
          finalEndTime = workLog.scheduledEndTime instanceof Date ? 
            Timestamp.fromDate(workLog.scheduledEndTime) : 
            workLog.scheduledEndTime;
          logger.debug('Using existing scheduledEndTime', { 
            component: 'WorkTimeEditor', 
            data: { scheduledEndTime: workLog.scheduledEndTime } 
          });
        }
        
        // 최종 저장 데이터 로깅
        logger.info('Virtual WorkLog final times', { 
          component: 'WorkTimeEditor', 
          data: {
            startTime: startTime || 'empty',
            endTime: endTime || 'empty',
            finalStartTime: finalStartTime ? 'set' : 'null',
            finalEndTime: finalEndTime ? 'set' : 'null'
          }
        });
        
        const createInput: WorkLogCreateInput = {
          staffId: staffId,
          eventId: workLog.eventId || '',
          staffName: '',  // prepareWorkLogForCreate에서 처리
          date: workLog.date,
          role: 'dealer',  // role 필드 필수 추가
          type: 'schedule',
          scheduledStartTime: finalStartTime,
          scheduledEndTime: finalEndTime,
          status: 'scheduled'
        };
        
        const workLogData = prepareWorkLogForCreate(createInput);
        await setDoc(workLogRef, workLogData);
        
        logger.info('가상 WorkLog를 실제 문서로 생성 완료', { component: 'WorkTimeEditor', data: { 
          id: realWorkLogId, 
          startTime: startTime || '미정',
          endTime: endTime || '미정' 
        } });
      } else {
        // 기존 WorkLog 업데이트 - 통합 시스템 사용
        const workLogRef = doc(db, 'workLogs', workLog.id);
        
        // 기존 값을 유지하면서 업데이트할 데이터 준비
        // 변경된 값만 업데이트하도록 수정
        const updatePayload: any = {};
        
        // startTime 처리 - 변경된 경우만 업데이트
        if (startTime === '') {
          // 빈 문자열은 명시적으로 "미정"으로 설정
          updatePayload.scheduledStartTime = null;
        } else if (startTime && startTime.trim() !== '') {
          // 새로운 값이 있으면 업데이트
          updatePayload.scheduledStartTime = newStartTime;
        } else if (startTime === undefined && workLog.scheduledStartTime) {
          // 초기값이 없지만 기존 값이 있으면 유지 (업데이트 안 함)
        }
        // startTime이 undefined이거나 변경되지 않았으면 updatePayload에 추가하지 않음
        
        // endTime 처리 - 변경된 경우만 업데이트
        if (endTime === '') {
          // 빈 문자열은 명시적으로 "미정"으로 설정
          updatePayload.scheduledEndTime = null;
        } else if (endTime && endTime.trim() !== '') {
          // 새로운 값이 있으면 업데이트
          updatePayload.scheduledEndTime = newEndTime;
        } else if (endTime === undefined && workLog.scheduledEndTime) {
          // 초기값이 없지만 기존 값이 있으면 유지 (업데이트 안 함)
        }
        // endTime이 undefined이거나 변경되지 않았으면 updatePayload에 추가하지 않음
        
        // updatePayload에 값이 있는 경우에만 업데이트 수행
        if (Object.keys(updatePayload).length > 0) {
          // Firebase에 전달되는 실제 데이터 로깅
          console.log('🔥 Firebase에 저장될 updatePayload:', {
            scheduledStartTime: updatePayload.scheduledStartTime,
            scheduledEndTime: updatePayload.scheduledEndTime,
            startTimeSeconds: updatePayload.scheduledStartTime?.seconds,
            endTimeSeconds: updatePayload.scheduledEndTime?.seconds,
            startTimeDate: updatePayload.scheduledStartTime?.toDate?.(),
            endTimeDate: updatePayload.scheduledEndTime?.toDate?.()
          });
          
          const updateData = prepareWorkLogForUpdate(updatePayload);
          
          console.log('🔥 prepareWorkLogForUpdate 후 데이터:', {
            scheduledStartTime: updateData.scheduledStartTime,
            scheduledEndTime: updateData.scheduledEndTime,
            startTimeSeconds: updateData.scheduledStartTime?.seconds,
            endTimeSeconds: updateData.scheduledEndTime?.seconds
          });
          
          await updateDoc(workLogRef, updateData);
          
          logger.info('WorkLog 업데이트 완료', { component: 'WorkTimeEditor', data: { 
            id: workLog.id, 
            startTime: startTime || '미정',
            endTime: endTime || '미정' 
          } });
        }
      }
      
      // 업데이트된 데이터로 콜백 호출 - 변경된 값만 반영
      if (onUpdate) {
        const updatedWorkLog = {
          ...workLog,
          id: finalWorkLogId, // 가상 ID를 실제 ID로 변경
          // 변경된 값만 업데이트, 변경되지 않은 값은 기존 값 유지
          scheduledStartTime: startTime === '' ? null : (startTime && startTime.trim() !== '' ? newStartTime : workLog.scheduledStartTime),
          scheduledEndTime: endTime === '' ? null : (endTime && endTime.trim() !== '' ? newEndTime : workLog.scheduledEndTime),
          updatedAt: Timestamp.now()
        };
        onUpdate(updatedWorkLog);
        
        // 업데이트 성공 로그
        logger.info('WorkTimeEditor onUpdate 콜백 호출 완료', { 
          component: 'WorkTimeEditor', 
          data: { 
            staffId: workLog.staffId,
            date: workLog.date,
            newStartTime: startTime || '미정',
            newEndTime: endTime || '미정'
          } 
        });
      }
      
      // 저장 후 Firebase에서 최신 데이터 다시 가져오기
      const workLogRef = doc(db, 'workLogs', finalWorkLogId);
      const docSnap = await getDoc(workLogRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        console.log('🔥 Firebase에서 다시 가져온 데이터:', {
          id: finalWorkLogId,
          scheduledStartTime: data.scheduledStartTime,
          scheduledEndTime: data.scheduledEndTime,
          startTimeSeconds: data.scheduledStartTime?.seconds,
          endTimeSeconds: data.scheduledEndTime?.seconds,
          startTimeDate: data.scheduledStartTime?.toDate?.(),
          endTimeDate: data.scheduledEndTime?.toDate?.()
        });
        
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
      
      // 동기화를 위한 짧은 지연 후 onUpdate 다시 호출
      // Firebase 저장이 완료되었으므로 Context 갱신 트리거
      setTimeout(() => {
        logger.info('🔄 동기화를 위한 추가 onUpdate 호출', { 
          component: 'WorkTimeEditor', 
          data: { 
            workLogId: finalWorkLogId,
            scheduledStartTime: startTime || '미정',
            scheduledEndTime: endTime || '미정'
          } 
        });
        
        // onUpdate를 다시 호출하여 Context 갱신 보장
        if (onUpdate) {
          const syncWorkLog = {
            ...workLog,
            id: finalWorkLogId,
            scheduledStartTime: startTime === '' ? null : (startTime && startTime.trim() !== '' ? newStartTime : workLog.scheduledStartTime),
            scheduledEndTime: endTime === '' ? null : (endTime && endTime.trim() !== '' ? newEndTime : workLog.scheduledEndTime),
            updatedAt: Timestamp.now()
          };
          onUpdate(syncWorkLog);
        }
      }, 500); // 500ms 지연으로 Firebase 저장 완료 보장
      
    } catch (error) {
      logger.error('시간 업데이트 중 오류 발생', error instanceof Error ? error : new Error(String(error)), { component: 'WorkTimeEditor' });
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
    
    // 정산 목적으로 예정시간 우선, 없으면 실제시간 사용
    // 표준화된 parseTimeToString 사용
    const actualStartTimeString = parseTimeToString(workLog.actualStartTime);
    const scheduledStartTimeString = parseTimeToString(workLog.scheduledStartTime);
    const startTimeString = scheduledStartTimeString || actualStartTimeString || '';
    
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
    if (!timeString) return { hour: '', minute: '' };
    const [hour, minute] = timeString.split(':');
    return { hour: hour || '', minute: minute || '' };
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
  const [startMinute, setStartMinute] = useState('');

  // 종료 시간 분리
  const [endHour, setEndHour] = useState('');
  const [endMinute, setEndMinute] = useState('');

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
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">{t('attendance.date')}</h3>
          <p className="text-gray-600">
            {(() => {
              try {
                // 1. scheduledStartTime이 있으면 우선 사용
                if (workLog.scheduledStartTime) {
                  const date = parseToDate(workLog.scheduledStartTime);
                  if (date) {
                    return date.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit', 
                      day: '2-digit',
                      weekday: 'short'
                    });
                  }
                }
                
                // 2. workLog.date가 있으면 사용
                if (workLog.date) {
                  const date = parseToDate(workLog.date);
                  if (date) {
                    return date.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit', 
                      weekday: 'short'
                    });
                  }
                  // parseToDate가 실패한 경우 원본 값 표시 (디버깅용)
                  return String(workLog.date);
                }
                
                return '날짜 정보 없음';
              } catch (error) {
                // Error displaying date
                return workLog.date ? String(workLog.date) : '날짜 오류';
              }
            })()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('attendance.eventId')}: {workLog.eventId}
          </p>
        </div>

        {/* 시간 편집 */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 flex items-center">
            <EditIcon className="w-5 h-5 mr-2 text-blue-600" />
            근무 시간 설정
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            출근/퇴근 시간을 자유롭게 수정할 수 있습니다. 시간을 입력하지 않으면 '미정'로 표시됩니다.
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
                    className="flex-1 px-3 py-2 border rounded-md font-mono text-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
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
                    className="flex-1 px-3 py-2 border rounded-md font-mono text-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">분</option>
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
                    className="w-full px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                    title="시작시간 지우기 (미정로 되돌리기)"
                  >
                    🗑️ 시작시간 지우기 (미정로 되돌리기)
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                퇴근 시간
                <span className="text-gray-500 text-xs ml-1">(선택사항)</span>
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <select
                    value={endHour}
                    onChange={(e) => handleEndTimeChange(e.target.value, endMinute)}
                    className="flex-1 px-3 py-2 border rounded-md font-mono text-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
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
                    className="flex-1 px-3 py-2 border rounded-md font-mono text-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">분</option>
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
                  className="w-full px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  title="종료시간을 미정으로 설정"
                >
                  🗑️ 종료시간 지우기 (미정으로 설정)
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* 근무 시간 요약 */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-3">근무 시간 요약</h3>
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              근무시간
            </label>
            <div className="text-2xl font-mono font-bold text-blue-600">
              {startTime ? (() => {
                if (endTime) {
                  // 시작/종료 시간 모두 있는 경우
                  const baseDate = toDate(workLog.scheduledStartTime || new Date());
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
                        <div className="text-sm text-orange-600 mt-1">
                          (다음날 {endTime}까지)
                        </div>
                      )}
                    </div>
                  );
                } else {
                  // 시작시간만 있는 경우
                  return (
                    <div>
                      <div className="text-lg">시작시간: {startTime}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        (종료시간 미정)
                      </div>
                    </div>
                  );
                }
              })() : (
                <div>
                  <div className="text-lg text-gray-500">시간 미정</div>
                  <div className="text-sm text-gray-400 mt-1">
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