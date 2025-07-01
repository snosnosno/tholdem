import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, where, updateDoc, setDoc, serverTimestamp, Timestamp, addDoc, getDocs } from 'firebase/firestore';
import { generateTimeSlots as utilGenerateTimeSlots, convertAssignmentData } from '../utils/timeUtils';
import { validateSchedule, ValidationResult, ValidationSettings, DEFAULT_VALIDATION_SETTINGS, DealerSchedule } from '../utils/shiftValidation';

// ShiftSchedule 데이터 구조 정의
export interface ShiftSchedule {
  id: string;
  eventId: string;
  date: string; // YYYY-MM-DD 형식
  timeInterval: number; // 분 단위 (10, 20, 30, 60)
  startTime: string; // HH:MM 형식
  endTime: string; // HH:MM 형식
  scheduleData: {
    [dealerId: string]: {
      dealerName: string;
      startTime: string; // 개인별 출근시간
      assignments: { [timeSlot: string]: string }; // "Table1" | "Table2" | "휴식" | "대기"
    }
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 딜러 정보 (기존 Staff와 호환)
export interface ShiftDealer {
  id: string;
  name: string;
  role: string;
  status?: 'on_table' | 'available' | 'on_break';
  assignedTableId?: string;
  photoURL?: string;
}

// 근무기록 데이터 구조 (기존 QR 출퇴근과 구분)
export interface WorkLog {
  id?: string;
  eventId: string;
  date: string; // YYYY-MM-DD
  dealerId: string;
  dealerName: string;
  type: 'schedule' | 'qr'; // 스케줄 기반 vs QR 실제 기록
  scheduledStartTime: string; // 스케줄상 출근시간
  scheduledEndTime: string; // 스케줄상 퇴근시간
  actualStartTime?: string; // QR 실제 출근시간 (옵션)
  actualEndTime?: string; // QR 실제 퇴근시간 (옵션)
  totalWorkMinutes: number; // 총 근무시간 (분)
  totalBreakMinutes: number; // 총 휴식시간 (분)
  tableAssignments: string[]; // 배정된 테이블 목록
  status: 'scheduled' | 'in_progress' | 'completed'; // 상태
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 시간 슬롯 생성 유틸리티 (개선된 버전 사용)
export const generateTimeSlots = utilGenerateTimeSlots;

export const useShiftSchedule = (eventId?: string, date?: string) => {
  const [schedule, setSchedule] = useState<ShiftSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationSettings, setValidationSettings] = useState<ValidationSettings>(DEFAULT_VALIDATION_SETTINGS);

  // 스케줄 문서 ID 생성
  const scheduleId = eventId && date ? `${eventId}_${date}` : null;

  // Firebase 실시간 리스너
  useEffect(() => {
    if (!scheduleId) {
      setSchedule(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const scheduleRef = doc(db, 'shiftSchedules', scheduleId);
    
    const unsubscribe = onSnapshot(
      scheduleRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setSchedule({ id: docSnapshot.id, ...docSnapshot.data() } as ShiftSchedule);
        } else {
          setSchedule(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching shift schedule:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [scheduleId]);

  // 새로운 스케줄 생성
  const createSchedule = useCallback(async (
    eventId: string,
    date: string,
    timeInterval: number = 30,
    startTime: string = '09:00',
    endTime: string = '18:00'
  ) => {
    try {
      const newScheduleId = `${eventId}_${date}`;
      const newSchedule: Omit<ShiftSchedule, 'id'> = {
        eventId,
        date,
        timeInterval,
        startTime,
        endTime,
        scheduleData: {},
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      const scheduleRef = doc(db, 'shiftSchedules', newScheduleId);
      await setDoc(scheduleRef, newSchedule);
      
      return newScheduleId;
    } catch (err) {
      console.error('Error creating schedule:', err);
      setError(err as Error);
      throw err;
    }
  }, []);

  // 딜러 할당 업데이트
  const updateDealerAssignment = useCallback(async (
    dealerId: string,
    timeSlot: string,
    assignment: string
  ) => {
    if (!scheduleId || !schedule) return;

    try {
      const scheduleRef = doc(db, 'shiftSchedules', scheduleId);
      const updatePath = `scheduleData.${dealerId}.assignments.${timeSlot}`;
      
      await updateDoc(scheduleRef, {
        [updatePath]: assignment,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating dealer assignment:', err);
      setError(err as Error);
      throw err;
    }
  }, [scheduleId, schedule]);

  // 딜러 추가
  const addDealer = useCallback(async (
    dealerId: string,
    dealerName: string,
    startTime: string = '09:00'
  ) => {
    if (!scheduleId) return;

    try {
      const scheduleRef = doc(db, 'shiftSchedules', scheduleId);
      const dealerData = {
        dealerName,
        startTime,
        assignments: {},
      };

      await updateDoc(scheduleRef, {
        [`scheduleData.${dealerId}`]: dealerData,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding dealer:', err);
      setError(err as Error);
      throw err;
    }
  }, [scheduleId]);
  
  // 시간 간격 및 시간 범위 업데이트
  const updateScheduleSettings = useCallback(async (
    newInterval?: number,
    newStartTime?: string,
    newEndTime?: string
  ) => {
    if (!scheduleId || !schedule) return;
  
    try {
      const scheduleRef = doc(db, 'shiftSchedules', scheduleId);
      const updates: any = {
        updatedAt: serverTimestamp(),
      };
  
      // 시간 간격 변경 시 기존 데이터 변환
      if (newInterval && newInterval !== schedule.timeInterval) {
        updates.timeInterval = newInterval;
        
        // 기존 할당 데이터 변환
        const convertedScheduleData: any = {};
        Object.entries(schedule.scheduleData).forEach(([dealerId, dealerData]) => {
          convertedScheduleData[dealerId] = {
            ...dealerData,
            assignments: convertAssignmentData(
              dealerData.assignments,
              schedule.timeInterval,
              newInterval,
              newStartTime || schedule.startTime,
              newEndTime || schedule.endTime
            )
          };
        });
        updates.scheduleData = convertedScheduleData;
      }
  
      if (newStartTime) updates.startTime = newStartTime;
      if (newEndTime) updates.endTime = newEndTime;
  
      await updateDoc(scheduleRef, updates);
    } catch (err) {
      console.error('Error updating schedule settings:', err);
      setError(err as Error);
      throw err;
    }
  }, [scheduleId, schedule]);

  // 시간 슬롯 생성 (메모이제이션)
  const timeSlots = useMemo(() => {
    if (!schedule) return [];
    return generateTimeSlots(schedule.startTime, schedule.endTime, schedule.timeInterval);
  }, [schedule?.startTime, schedule?.endTime, schedule?.timeInterval]);

  // 딜러 목록 (메모이제이션)
  const dealers = useMemo(() => {
    if (!schedule) return [];
    return Object.entries(schedule.scheduleData).map(([id, data]) => ({
      id,
      ...data,
    }));
  }, [schedule?.scheduleData]);

  // 스케줄 검증 함수
  const validateCurrentSchedule = useCallback(() => {
    if (!schedule || !timeSlots.length || !dealers.length) {
      setValidationResult(null);
      return null;
    }

    const dealerSchedules: DealerSchedule[] = dealers.map(dealer => ({
      id: dealer.id,
      dealerName: dealer.dealerName,
      startTime: dealer.startTime,
      assignments: dealer.assignments,
    }));

    const result = validateSchedule(dealerSchedules, timeSlots, validationSettings);
    setValidationResult(result);
    return result;
  }, [schedule, timeSlots, dealers, validationSettings]);

  // 검증 설정 업데이트
  const updateValidationSettings = useCallback((newSettings: Partial<ValidationSettings>) => {
    setValidationSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // 스케줄 변경 시 자동 검증 (메모이제이션)
  const autoValidationResult = useMemo(() => {
    if (!schedule || !timeSlots.length || !dealers.length) return null;

    const dealerSchedules: DealerSchedule[] = dealers.map(dealer => ({
      id: dealer.id,
      dealerName: dealer.dealerName,
      startTime: dealer.startTime,
      assignments: dealer.assignments,
    }));

    return validateSchedule(dealerSchedules, timeSlots, validationSettings);
  }, [schedule?.scheduleData, timeSlots, validationSettings]);

  // 자동 검증 결과를 상태에 반영
  useEffect(() => {
    setValidationResult(autoValidationResult);
  }, [autoValidationResult]);

  // 근무기록 자동 생성 함수
  const generateWorkLogs = useCallback(async () => {
    if (!schedule || !eventId || !date) {
      throw new Error('스케줄, 이벤트 ID, 날짜 정보가 필요합니다.');
    }

    try {
      const workLogsCollection = collection(db, 'workLogs');
      const generatedLogs: Omit<WorkLog, 'id'>[] = [];

      // 각 딜러별로 근무기록 생성
      for (const dealer of dealers) {
        const { id: dealerId, dealerName, startTime: dealerStartTime, assignments } = dealer;
        
        // 시간 슬롯별 할당 데이터 분석
        let totalWorkMinutes = 0;
        let totalBreakMinutes = 0;
        const tableAssignments: string[] = [];
        let actualStartTime: string | null = null;
        let actualEndTime: string | null = null;

        // 할당된 시간 슬롯들 순회
        timeSlots.forEach(timeSlot => {
          const assignment = assignments[timeSlot];
          if (assignment && assignment !== '대기') {
            if (!actualStartTime) actualStartTime = timeSlot;
            actualEndTime = timeSlot;
            
            if (assignment === '휴식') {
              totalBreakMinutes += schedule.timeInterval;
            } else if (assignment.startsWith('T') || assignment.startsWith('Table')) {
              totalWorkMinutes += schedule.timeInterval;
              if (!tableAssignments.includes(assignment)) {
                tableAssignments.push(assignment);
              }
            }
          }
        });

        // 스케줄상 시작/종료 시간 계산
        const scheduledStartTime = dealerStartTime;
        const scheduledEndTime = actualEndTime || schedule.endTime;

        const workLog: Omit<WorkLog, 'id'> = {
          eventId,
          date,
          dealerId,
          dealerName,
          type: 'schedule',
          scheduledStartTime,
          scheduledEndTime,
          totalWorkMinutes,
          totalBreakMinutes,
          tableAssignments,
          status: 'scheduled',
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        };

        generatedLogs.push(workLog);
      }

      // Firestore에 일괄 저장
      for (const log of generatedLogs) {
        await addDoc(workLogsCollection, log);
      }

      console.log(`${generatedLogs.length}개의 근무기록이 생성되었습니다.`);
      return generatedLogs;
    } catch (error) {
      console.error('근무기록 생성 중 오류:', error);
      throw error;
    }
  }, [schedule, eventId, date, dealers, timeSlots]);

  // 근무기록 존재 여부 확인 함수
  const checkWorkLogsExist = useCallback(async () => {
    if (!eventId || !date) return false;

    try {
      const workLogsQuery = query(
        collection(db, 'workLogs'),
        where('eventId', '==', eventId),
        where('date', '==', date),
        where('type', '==', 'schedule')
      );
      
      const snapshot = await getDocs(workLogsQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('근무기록 확인 중 오류:', error);
      return false;
    }
  }, [eventId, date]);

  return {
    schedule,
    loading,
    error,
    timeSlots,
    dealers,
    validationResult,
    validationSettings,
    createSchedule,
    updateDealerAssignment,
    addDealer,
    updateScheduleSettings,
    validateCurrentSchedule,
    updateValidationSettings,
    generateWorkLogs,
    checkWorkLogsExist,
  };
};

export default useShiftSchedule;