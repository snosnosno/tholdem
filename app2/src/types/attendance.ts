// 출석 관련 타입 정의
export type ExceptionType = 'late' | 'early_leave' | 'absence' | 'overtime';

export interface AttendanceException {
  type: ExceptionType;
  description: string;
  managerNote?: string;
  detectedAt: string; // ISO timestamp
  resolvedAt?: string; // ISO timestamp
}

export interface ExceptionSettings {
  lateThresholdMinutes: number; // 지각 기준 (분)
  earlyLeaveThresholdMinutes: number; // 조퇴 기준 (분)
  overtimeThresholdMinutes: number; // 초과근무 기준 (분)
}

export const DEFAULT_EXCEPTION_SETTINGS: ExceptionSettings = {
  lateThresholdMinutes: 15, // 15분 초과 시 지각
  earlyLeaveThresholdMinutes: 30, // 30분 미만 시 조퇴
  overtimeThresholdMinutes: 60, // 60분 초과 시 초과근무
};

// 예외 상황별 설정
export const EXCEPTION_CONFIGS = {
  late: {
    color: 'orange',
    icon: '⏰',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300'
  },
  early_leave: {
    color: 'yellow',
    icon: '⏳',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300'
  },
  absence: {
    color: 'red',
    icon: '❌',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300'
  },
  overtime: {
    color: 'purple',
    icon: '⏱️',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300'
  }
} as const;