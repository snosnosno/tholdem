import { WorkLog } from '../hooks/useShiftSchedule';
import { AttendanceException, ExceptionType, DEFAULT_EXCEPTION_SETTINGS, ExceptionSettings } from '../types/attendance';

export class AttendanceExceptionDetector {
  private settings: ExceptionSettings;

  constructor(settings: ExceptionSettings = DEFAULT_EXCEPTION_SETTINGS) {
    this.settings = settings;
  }

  detectExceptions(workLog: WorkLog): AttendanceException[] {
    const exceptions: AttendanceException[] = [];
    const now = new Date();
    const detectedAt = now.toISOString();

    if (!workLog.actualStartTime && this.isWorkDayPassed(workLog)) {
      exceptions.push({
        type: 'absence',
        description: 'No check-in record found',
        detectedAt
      });
      return exceptions;
    }

    if (workLog.actualStartTime && workLog.scheduledStartTime) {
      const lateMinutes = this.calculateLateMinutes(workLog.actualStartTime, workLog.scheduledStartTime);
      if (lateMinutes > this.settings.lateThresholdMinutes) {
        exceptions.push({
          type: 'late',
          description: `Late arrival: ${lateMinutes} minutes`,
          detectedAt
        });
      }
    }

    return exceptions;
  }

  private isWorkDayPassed(workLog: WorkLog): boolean {
    if (!workLog.date || !workLog.scheduledEndTime) return false;
    
    const workDate = new Date(workLog.date);
    const [hours, minutes] = workLog.scheduledEndTime.split(':').map(Number);
    const scheduledEndDateTime = new Date(workDate);
    scheduledEndDateTime.setHours(hours, minutes, 0, 0);
    
    return Date.now() > scheduledEndDateTime.getTime();
  }

  private calculateLateMinutes(actualTime: string, scheduledTime: string): number {
    const actual = this.timeStringToMinutes(actualTime);
    const scheduled = this.timeStringToMinutes(scheduledTime);
    return Math.max(0, actual - scheduled);
  }

  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

export const attendanceExceptionDetector = new AttendanceExceptionDetector();

export const getExceptionIcon = (type: ExceptionType): string => {
  switch (type) {
    case 'late': return '⏰';
    case 'early_leave': return '🚪';
    case 'absence': return '❌';
    case 'overtime': return '🕐';
    default: return '⚠️';
  }
};

export const getExceptionSeverity = (exception: AttendanceException): 'low' | 'medium' | 'high' => {
  switch (exception.type) {
    case 'absence': return 'high';
    case 'late': return 'medium';
    case 'early_leave': return 'medium';
    case 'overtime': return 'low';
    default: return 'medium';
  }
};