// Job Posting 관련 타입 정의
import { timestampToLocalDateString } from '../utils/dateUtils';

// 사전 질문 타입 정의
export interface PreQuestion {
  id: string;
  question: string;
  required: boolean;
  type: 'text' | 'textarea' | 'select';
  options?: string[]; // select 타입일 때만 사용
}

// 사전 질문 답변 타입 정의  
export interface PreQuestionAnswer {
  questionId: string;
  question?: string; // 질문 텍스트 (호환성을 위해 optional)
  answer: string;
  required?: boolean; // 필수 여부 (호환성을 위해 optional)
}

// 지원자 타입 정의
export interface Applicant {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  timeSlot: string;
  date?: string; // 지원 날짜 (기존 호환성)
  assignedDate?: string; // yyyy-MM-dd format - 확정된 스태프 할당 날짜
  createdAt: import('firebase/firestore').Timestamp; // Firebase Timestamp
  status: 'pending' | 'confirmed' | 'rejected';
  jobPostingId: string;
  additionalInfo?: string;
  
  // 다중 선택 지원을 위한 새로운 필드들 (하위 호환성을 위해 선택적)
  assignedRoles?: string[]; // 선택한 역할들
  assignedTimes?: string[]; // 선택한 시간들
  assignedDates?: string[]; // 선택한 날짜들
}


// 다중 선택 관련 유틸리티 타입들
export interface MultipleSelection {
  roles: string[];
  times: string[];
  dates: string[];
}

// 복리후생 정보 타입
export interface Benefits {
  guaranteedHours?: string; // 보장시간
  clothing?: string;        // 복장
  meal?: string;           // 식사
  transportation?: string;  // 교통비
  mealAllowance?: string;   // 식비
  accommodation?: string;   // 숙소
}

// 공고 작성/수정 폼 데이터 타입
export interface JobPostingFormData {
  title: string;
  type: string;
  description: string;
  location: string;
  detailedAddress?: string;
  district?: string;       // 시/군/구
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  usesDifferentDailyRequirements?: boolean;
  timeSlots?: TimeSlot[];
  dateSpecificRequirements?: DateSpecificRequirement[];
  preQuestions?: PreQuestion[];
  requiredRoles?: string[];
  salaryType?: 'hourly' | 'daily' | 'monthly' | 'other'; // 급여 유형
  salaryAmount?: string;    // 급여 금액
  benefits?: Benefits;       // 복리후생 정보
}

export interface SelectionItem {
  timeSlot: string;
  role: string;
  date?: string;
}

// 기존 타입들 (기존 호환성 유지)
export interface RoleRequirement {
  name: string;
  count: number;
}

// 확장된 TimeSlot 인터페이스 - 일자별 인원 요구사항 및 미정 지원
export interface TimeSlot {
  time: string;
  roles: RoleRequirement[];
  date?: string; // 선택적 필드: yyyy-MM-dd 형식, 특정 날짜에만 적용될 때 사용
  
  // 미정 기능 지원
  isTimeToBeAnnounced?: boolean;    // 미정 여부 플래그
  tentativeDescription?: string;    // 임시 설명 텍스트 ("오후 예정", "저녁 시간대" 등)
}

// 일자별 인원 요구사항을 위한 헬퍼 인터페이스
export interface DateSpecificRequirement {
  date: string; // yyyy-MM-dd 형식
  timeSlots: TimeSlot[];
}

// 확장된 JobPosting 인터페이스
export interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string;
  detailedAddress?: string; // 상세 주소 (선택사항)
  district?: string;       // 시/군/구 (선택사항)
  type: string;
  status: 'open' | 'closed';
  startDate: import('firebase/firestore').Timestamp; // Firebase Timestamp
  endDate: import('firebase/firestore').Timestamp;   // Firebase Timestamp
  createdAt: import('firebase/firestore').Timestamp; // Firebase Timestamp
  createdBy: string; // 공고 작성자 UID
  updatedAt?: import('firebase/firestore').Timestamp; // Firebase Timestamp (수정 시)
  updatedBy?: string; // 수정자 UID
  managerId?: string;
  timeSlots?: TimeSlot[]; // 기존 전체 기간 공통 타임슬롯
  dateSpecificRequirements?: DateSpecificRequirement[]; // 일자별 특화 요구사항
  preQuestions?: PreQuestion[]; // 사전 질문 (선택사항)
  confirmedStaff?: ConfirmedStaff[];
  searchIndex?: string[];
  requirements?: any[];
  manager?: string;
  requiredRoles?: string[]; // 필터링용
  salaryType?: 'hourly' | 'daily' | 'monthly' | 'other'; // 급여 유형 (선택사항)
  salaryAmount?: string;    // 급여 금액 (선택사항)
  benefits?: Benefits;       // 복리후생 정보 (선택사항)
  [key: string]: any;
}

// 확정된 스태프 정보
export interface ConfirmedStaff {
  userId: string;
  role: string;
  timeSlot: string;
  date?: string; // 일자별 요구사항에 대응하는 날짜
}

// Job Posting 필터 인터페이스
export interface JobPostingFilters {
  location: string;
  type: string;
  startDate: string;
  role: string;
  month?: string; // Optional month filter (01-12)
  day?: string;   // Optional day filter (01-31)
  searchTerms?: string[]; // Optional search terms
}

// 데이터 변환 유틸리티 함수들
export class JobPostingUtils {
  
  /**
   * 기존 TimeSlot 배열을 일자별 요구사항으로 변환
   * @param timeSlots 기존 timeSlots
   * @param dates 적용할 날짜 배열
   * @returns DateSpecificRequirement 배열
   */
  static convertToDateSpecific(
    timeSlots: TimeSlot[], 
    dates: string[]
  ): DateSpecificRequirement[] {
    return dates.map(date => ({
      date,
      timeSlots: timeSlots.map(ts => ({
        ...ts,
        date // 각 timeSlot에 date 추가
      }))
    }));
  }

  /**
   * 일자별 요구사항을 기존 형식으로 변환 (호환성)
   * @param dateSpecificRequirements 일자별 요구사항
   * @returns 첫 번째 날짜의 timeSlots 또는 빈 배열
   */
  static convertToLegacyTimeSlots(
    dateSpecificRequirements?: DateSpecificRequirement[]
  ): TimeSlot[] {
    if (!dateSpecificRequirements || dateSpecificRequirements.length === 0) {
      return [];
    }
    
    // 첫 번째 날짜의 timeSlots를 반환 (date 필드 제거)
    const firstRequirement = dateSpecificRequirements[0];
    if (!firstRequirement) return [];
    
    return firstRequirement.timeSlots.map(ts => ({
      time: ts.time,
      roles: ts.roles
    }));
  }

  /**
   * JobPosting이 일자별 요구사항을 사용하는지 확인
   * @param jobPosting 
   * @returns boolean
   */
  static hasDateSpecificRequirements(jobPosting: JobPosting): boolean {
    return !!(jobPosting.dateSpecificRequirements && 
              jobPosting.dateSpecificRequirements.length > 0);
  }

  /**
   * 특정 날짜의 TimeSlot들을 가져오기
   * @param jobPosting 
   * @param date yyyy-MM-dd 형식
   * @returns TimeSlot 배열
   */
  static getTimeSlotsForDate(
    jobPosting: JobPosting, 
    date: string
  ): TimeSlot[] {
    if (this.hasDateSpecificRequirements(jobPosting)) {
      const dateReq = jobPosting.dateSpecificRequirements?.find(dr => dr.date === date);
      return dateReq?.timeSlots || [];
    }
    
    // 기존 방식: 전체 기간 공통 timeSlots 사용
    return jobPosting.timeSlots || [];
  }

  /**
   * JobPosting의 모든 필요 역할들 추출 (필터링용)
   * @param jobPosting 
   * @returns 역할 이름 배열
   */
  static extractRequiredRoles(jobPosting: JobPosting): string[] {
    const roles = new Set<string>();
    
    // 기존 timeSlots에서 역할 추출
    if (jobPosting.timeSlots) {
      jobPosting.timeSlots.forEach(ts => {
        ts.roles.forEach(role => roles.add(role.name));
      });
    }
    
    // 일자별 요구사항에서 역할 추출
    if (jobPosting.dateSpecificRequirements) {
      jobPosting.dateSpecificRequirements.forEach(dateReq => {
        dateReq.timeSlots.forEach(ts => {
          ts.roles.forEach(role => roles.add(role.name));
        });
      });
    }
    
    return Array.from(roles);
  }

  /**
   * 특정 날짜와 시간대, 역할에 대한 확정된 스태프 수 계산
   * @param jobPosting 
   * @param date 
   * @param timeSlot 
   * @param role 
   * @returns 확정된 스태프 수
   */
  static getConfirmedStaffCount(
    jobPosting: JobPosting,
    date: string,
    timeSlot: string,
    role: string
  ): number {
    if (!jobPosting.confirmedStaff) return 0;
    
    
    // 입력 날짜도 변환 (안전성을 위해)
    const targetDate = timestampToLocalDateString(date);
    
    return jobPosting.confirmedStaff.filter(staff => {
      const staffDate = timestampToLocalDateString(staff.date);
      return staff.timeSlot === timeSlot && 
             staff.role === role &&
             staffDate === targetDate; // 정확한 날짜 매칭만
    }).length;
  }
  
  /**
   * 특정 날짜에 지원한 지원자들 필터링
   * @param applicants 지원자 목록
   * @param date yyyy-MM-dd 형식
   * @returns 해당 날짜에 지원한 지원자 목록
   */
  static getApplicantsByDate(applicants: Applicant[], date: string): Applicant[] {
    return applicants.filter(applicant => 
      applicant.assignedDate === date || 
      applicant.date === date
    );
  }
  
  /**
   * 특정 날짜에 할당된 확정 스태프들 필터링
   * @param staff 확정 스태프 목록
   * @param date yyyy-MM-dd 형식
   * @returns 해당 날짜에 할당된 확정 스태프 목록
   */
  static getConfirmedStaffByDate(staff: ConfirmedStaff[], date: string): ConfirmedStaff[] {
    return staff.filter(s => s.date === date);
  }
  
  /**
   * 날짜별 지원자 통계 계산
   * @param applicants 지원자 목록
   * @returns 날짜별 지원자 수 맵
   */
  static getApplicantStatsByDate(applicants: Applicant[]): Map<string, number> {
    const stats = new Map<string, number>();
    
    applicants.forEach(applicant => {
      const date = applicant.assignedDate || applicant.date;
      if (date) {
        stats.set(date, (stats.get(date) || 0) + 1);
      }
    });
    
    return stats;
  }
  
  /**
   * 날짜별 요구인원 대비 확정 스태프 비율 계산
   * @param jobPosting 공고
   * @param date yyyy-MM-dd 형식
   * @returns 0-1 사이의 비율
   */
  static getDateFulfillmentRate(jobPosting: JobPosting, date: string): number {
    if (!this.hasDateSpecificRequirements(jobPosting)) {
      return 0;
    }
    
    const dateReq = jobPosting.dateSpecificRequirements?.find(dr => dr.date === date);
    if (!dateReq) return 0;
    
    let totalRequired = 0;
    let totalConfirmed = 0;
    
    dateReq.timeSlots.forEach(ts => {
      ts.roles.forEach(role => {
        totalRequired += role.count;
        totalConfirmed += this.getConfirmedStaffCount(jobPosting, date, ts.time, role.name);
      });
    });
    
    return totalRequired > 0 ? totalConfirmed / totalRequired : 0;
  }
  
  /**
   * 일자별 다른 인원 요구사항이 있는 공고의 전체 완료 여부 확인
   * @param jobPosting 공고
   * @returns 모든 날짜의 요구사항이 충족되면 true
   */
  static isAllDateRequirementsFulfilled(jobPosting: JobPosting): boolean {
    if (!this.hasDateSpecificRequirements(jobPosting)) {
      return false;
    }
    
    return jobPosting.dateSpecificRequirements?.every(dateReq => 
      this.getDateFulfillmentRate(jobPosting, dateReq.date) >= 1.0
    ) || false;
  }
  
  /**
   * 특정 역할이 마감되었는지 확인 (날짜별 요구사항 지원)
   * @param jobPosting 공고
   * @param timeSlot 시간대
   * @param role 역할
   * @param date 날짜 (선택사항)
   * @returns 마감 여부
   */
  static isRoleFull(
    jobPosting: JobPosting,
    timeSlot: string,
    role: string,
    date?: string
  ): boolean {
    if (!jobPosting.confirmedStaff) return false;
    
    
    // 해당 시간대와 역할의 요구 인원 수 찾기
    let requiredCount = 0;
    
    if (date && this.hasDateSpecificRequirements(jobPosting)) {
      // 날짜별 요구사항에서 찾기
      const targetDate = timestampToLocalDateString(date);
      const dateReq = jobPosting.dateSpecificRequirements?.find(dr => {
        const drDate = timestampToLocalDateString(dr.date);
        return drDate === targetDate;
      });
      const ts = dateReq?.timeSlots.find(t => t.time === timeSlot);
      const roleReq = ts?.roles.find(r => r.name === role);
      requiredCount = roleReq?.count || 0;
    } else {
      // 기존 timeSlots에서 찾기
      const ts = jobPosting.timeSlots?.find(t => t.time === timeSlot);
      const roleReq = ts?.roles.find(r => r.name === role);
      requiredCount = roleReq?.count || 0;
    }
    
    // 확정된 스태프 수 계산
    const confirmedCount = date 
      ? this.getConfirmedStaffCount(jobPosting, date, timeSlot, role)
      : jobPosting.confirmedStaff.filter(staff => 
          staff.timeSlot === timeSlot && 
          staff.role === role
        ).length;
    
    return confirmedCount >= requiredCount;
  }
  
  /**
   * 날짜별, 역할별 확정 인원 수 계산
   * @param jobPosting 공고
   * @param date 날짜 (선택사항)
   * @param role 역할 (선택사항)
   * @returns 확정 인원 수 맵
   */
  static getConfirmedStaffCountByDateAndRole(
    jobPosting: JobPosting,
    date?: string,
    role?: string
  ): Map<string, number> {
    const countMap = new Map<string, number>();
    
    if (!jobPosting.confirmedStaff) return countMap;
    
    jobPosting.confirmedStaff.forEach(staff => {
      // 필터링 조건 적용
      if (date && staff.date !== date) return;
      if (role && staff.role !== role) return;
      
      // 키 생성 (날짜_시간_역할)
      const key = `${staff.date || 'all'}_${staff.timeSlot}_${staff.role}`;
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });
    
    return countMap;
  }
  
  /**
   * 날짜별 요구사항 진행률 계산
   * @param jobPosting 공고
   * @returns 날짜별 진행률 맵 { date: { confirmed: number, required: number, percentage: number } }
   */
  static getRequirementProgress(jobPosting: JobPosting): Map<string, {
    confirmed: number;
    required: number;
    percentage: number;
  }> {
    const progressMap = new Map();
    
    if (this.hasDateSpecificRequirements(jobPosting)) {
      // 날짜별 요구사항이 있는 경우
      jobPosting.dateSpecificRequirements?.forEach(dateReq => {
        let totalRequired = 0;
        let totalConfirmed = 0;
        
        dateReq.timeSlots.forEach(ts => {
          ts.roles.forEach(role => {
            totalRequired += role.count;
            totalConfirmed += this.getConfirmedStaffCount(
              jobPosting, 
              dateReq.date, 
              ts.time, 
              role.name
            );
          });
        });
        
        progressMap.set(dateReq.date, {
          confirmed: totalConfirmed,
          required: totalRequired,
          percentage: totalRequired > 0 ? Math.round((totalConfirmed / totalRequired) * 100) : 0
        });
      });
    } else {
      // 기존 방식 (전체 기간 동일)
      let totalRequired = 0;
      let totalConfirmed = 0;
      
      jobPosting.timeSlots?.forEach(ts => {
        ts.roles.forEach(role => {
          totalRequired += role.count;
          totalConfirmed += jobPosting.confirmedStaff?.filter(staff => 
            staff.timeSlot === ts.time && staff.role === role.name
          ).length || 0;
        });
      });
      
      progressMap.set('all', {
        confirmed: totalConfirmed,
        required: totalRequired,
        percentage: totalRequired > 0 ? Math.round((totalConfirmed / totalRequired) * 100) : 0
      });
    }
    
    return progressMap;
  }
  
  // ===== 다중 선택 지원을 위한 헬퍼 함수들 =====
  
  /**
   * 단일 선택을 다중 선택 형식으로 변환
   * @param applicant 기존 단일 선택 지원자
   * @returns 다중 선택 필드가 추가된 Applicant
   */
  static convertSingleToMultiple(applicant: Applicant): Applicant {
    return {
      ...applicant,
      assignedRoles: applicant.assignedRoles || [applicant.role],
      assignedTimes: applicant.assignedTimes || [applicant.timeSlot],
      assignedDates: applicant.assignedDates || (applicant.assignedDate ? [applicant.assignedDate] : [])
    };
  }
  
  /**
   * 다중 선택에서 첫 번째 값을 단일 선택 필드로 변환
   * @param applicant 다중 선택 지원자
   * @returns 단일 선택 필드가 업데이트된 Applicant
   */
  static convertMultipleToSingle(applicant: Applicant): Applicant {
    const result: Applicant = {
      ...applicant,
      role: applicant.assignedRoles?.[0] || applicant.role,
      timeSlot: applicant.assignedTimes?.[0] || applicant.timeSlot
    };
    
    // assignedDate는 optional이므로 조건부로 추가
    const newAssignedDate = applicant.assignedDates?.[0] || applicant.assignedDate;
    if (newAssignedDate !== undefined) {
      result.assignedDate = newAssignedDate;
    }
    
    return result;
  }
  
  /**
   * 지원자가 다중 선택을 사용하는지 확인
   * @param applicant 지원자
   * @returns 다중 선택 사용 여부
   */
  static hasMultipleSelections(applicant: Applicant): boolean {
    return !!(applicant.assignedRoles?.length || 
              applicant.assignedTimes?.length || 
              applicant.assignedDates?.length);
  }
  
  /**
   * 다중 선택 데이터의 유효성 검증
   * @param selection 다중 선택 데이터
   * @returns 유효성 검증 결과
   */
  static validateMultipleSelections(selection: MultipleSelection): boolean {
    return Array.isArray(selection.roles) && selection.roles.length > 0 &&
           Array.isArray(selection.times) && selection.times.length > 0 &&
           Array.isArray(selection.dates);
  }
  
  /**
   * 다중 선택에서 선택 아이템 목록 생성
   * @param selection 다중 선택 데이터
   * @returns SelectionItem 배열
   */
  static generateSelectionItems(selection: MultipleSelection): SelectionItem[] {
    const items: SelectionItem[] = [];
    
    selection.times.forEach(time => {
      selection.roles.forEach(role => {
        if (selection.dates.length > 0) {
          selection.dates.forEach(date => {
            items.push({ timeSlot: time, role, date });
          });
        } else {
          items.push({ timeSlot: time, role });
        }
      });
    });
    
    return items;
  }
  
  /**
   * 레거시 지원자 데이터 판별 (기존 단일 선택 형식)
   * @param applicant 지원자
   * @returns 레거시 형식 여부
   */
  static isLegacyApplication(applicant: Applicant): boolean {
    return !this.hasMultipleSelections(applicant);
  }
}

// 타입 가드 함수들
export const isValidTimeSlot = (obj: any): obj is TimeSlot => {
  return obj && 
         typeof obj.time === 'string' && 
         Array.isArray(obj.roles) &&
         obj.roles.every((role: any) => 
           typeof role.name === 'string' && 
           typeof role.count === 'number'
         ) &&
         // 미정 필드 검증 (선택적)
         (!obj.isTimeToBeAnnounced || typeof obj.isTimeToBeAnnounced === 'boolean') &&
         (!obj.tentativeDescription || typeof obj.tentativeDescription === 'string');
};

export const isValidJobPosting = (obj: any): obj is JobPosting => {
  return obj && 
         typeof obj.id === 'string' &&
         typeof obj.title === 'string' &&
         typeof obj.status === 'string' &&
         (obj.status === 'open' || obj.status === 'closed');
};

/**
 * 지원자 인터페이스 유효성 검증 (다중 선택 지원)
 * @param obj 검증할 객체
 * @returns 지원자 인터페이스 준수 여부
 */
export const isValidApplicant = (obj: any): obj is Applicant => {
  const isBasicValid = obj && 
         typeof obj.id === 'string' &&
         typeof obj.userId === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.role === 'string' &&
         typeof obj.timeSlot === 'string' &&
         typeof obj.status === 'string' &&
         ['pending', 'confirmed', 'rejected'].includes(obj.status) &&
         (!obj.date || typeof obj.date === 'string') &&
         (!obj.assignedDate || typeof obj.assignedDate === 'string') &&
         (!obj.assignedDate || /^\d{4}-\d{2}-\d{2}$/.test(obj.assignedDate));
  
  if (!isBasicValid) return false;
  
  // 다중 선택 필드 검증 (선택적)
  const isMultipleFieldsValid = 
    (!obj.assignedRoles || (Array.isArray(obj.assignedRoles) && obj.assignedRoles.every((r: any) => typeof r === 'string'))) &&
    (!obj.assignedTimes || (Array.isArray(obj.assignedTimes) && obj.assignedTimes.every((t: any) => typeof t === 'string'))) &&
    (!obj.assignedDates || (Array.isArray(obj.assignedDates) && obj.assignedDates.every((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))));
  
  return isMultipleFieldsValid;
};

/**
 * 날짜 형식 유효성 검증
 * @param dateString 검증할 날짜 문자열
 * @returns yyyy-MM-dd 형식 준수 여부
 */
export const isValidDateString = (dateString: string): boolean => {
  if (!dateString) return false;
  
  // yyyy-MM-dd 형식 검증
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  // 실제 날짜 유효성 검증
  const date = new Date(dateString);
  const isoDatePart = date.toISOString().split('T')[0];
  return isoDatePart === dateString;
};

/**
 * 일자별 요구사항 인터페이스 유효성 검증
 * @param obj 검증할 객체
 * @returns DateSpecificRequirement 인터페이스 준수 여부
 */
export const isValidDateSpecificRequirement = (obj: any): obj is DateSpecificRequirement => {
  return obj && 
         typeof obj.date === 'string' &&
         isValidDateString(obj.date) &&
         Array.isArray(obj.timeSlots) &&
         obj.timeSlots.every(isValidTimeSlot);
};

// ===========================================
// 템플릿 관련 타입 정의
// ===========================================

export interface JobPostingTemplate {
  id: string;
  name: string;                              // 템플릿 이름
  description?: string;                      // 템플릿 설명
  createdAt: import('firebase/firestore').Timestamp;                           // Firebase Timestamp
  createdBy: string;                        // 생성자 UID
  
  // 템플릿으로 저장할 공고 데이터 (날짜 제외)
  templateData: {
    title: string;
    type: string;
    description: string;
    location: string;
    detailedAddress?: string;
    district?: string;
    timeSlots?: TimeSlot[];
    dateSpecificRequirements?: DateSpecificRequirement[];
    usesDifferentDailyRequirements: boolean;
    preQuestions?: PreQuestion[];
    usesPreQuestions: boolean;
    salaryType?: 'hourly' | 'daily' | 'monthly' | 'other';
    salaryAmount?: string;
    benefits?: Benefits;
  };
  
  // 메타 정보
  usageCount?: number;                      // 사용 횟수
  lastUsedAt?: any;                        // 마지막 사용 시간
  isPublic?: boolean;                      // 공개 템플릿 여부 (미래 확장용)
}

// 템플릿 생성 시 사용할 인터페이스
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  templateData: JobPostingTemplate['templateData'];
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

// 템플릿 검색/필터 인터페이스  
export interface TemplateFilters {
  createdBy?: string;
  location?: string;
  type?: string;
  searchTerm?: string;
}

// 템플릿 관련 유틸리티 클래스
export class TemplateUtils {
  /**
   * JobPosting 데이터에서 템플릿 데이터 추출
   * @param formData 폼 데이터
   * @returns 템플릿 데이터
   */
  static extractTemplateData(formData: any): JobPostingTemplate['templateData'] {
    return {
      title: formData.title,
      type: formData.type,
      description: formData.description,
      location: formData.location,
      detailedAddress: formData.detailedAddress,
      timeSlots: formData.timeSlots,
      dateSpecificRequirements: formData.dateSpecificRequirements,
      usesDifferentDailyRequirements: formData.usesDifferentDailyRequirements,
      preQuestions: formData.preQuestions,
      usesPreQuestions: formData.usesPreQuestions
    };
  }

  /**
   * 템플릿 데이터를 폼 데이터로 변환 (날짜는 오늘로 설정)
   * @param templateData 템플릿 데이터
   * @returns 폼 데이터
   */
  static templateToFormData(templateData: JobPostingTemplate['templateData']): any {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      ...templateData,
      startDate: today,
      endDate: today,
      status: 'open'
    };
  }

  /**
   * 템플릿 이름 유효성 검증
   * @param name 템플릿 이름
   * @returns 유효성 여부
   */
  static validateTemplateName(name: string): boolean {
    return name.trim().length >= 2 && name.trim().length <= 50;
  }

  /**
   * 템플릿 데이터에서 검색 키워드 생성
   * @param template 템플릿
   * @returns 검색 키워드 배열
   */
  static generateSearchKeywords(template: JobPostingTemplate): string[] {
    const keywords = new Set<string>();
    
    // 템플릿 이름
    keywords.add(template.name.toLowerCase());
    
    // 제목
    if (template.templateData.title) {
      keywords.add(template.templateData.title.toLowerCase());
    }
    
    // 위치
    if (template.templateData.location) {
      keywords.add(template.templateData.location.toLowerCase());
    }
    
    // 타입
    keywords.add(template.templateData.type.toLowerCase());
    
    // 역할들
    template.templateData.timeSlots?.forEach(ts => {
      ts.roles.forEach(role => {
        keywords.add(role.name.toLowerCase());
      });
    });
    
    template.templateData.dateSpecificRequirements?.forEach(dsr => {
      dsr.timeSlots.forEach(ts => {
        ts.roles.forEach(role => {
          keywords.add(role.name.toLowerCase());
        });
      });
    });
    
    return Array.from(keywords);
  }
}

// ===========================================
// 마감 로직 관련 헬퍼 함수들
// ===========================================

/**
 * 특정 날짜의 모든 요구사항이 충족되었는지 확인
 * @param jobPosting 공고 데이터
 * @param dateReq 날짜별 요구사항
 * @returns 해당 날짜의 모든 요구사항 충족 여부
 */
export const checkDateRequirementsFulfilled = (jobPosting: any, dateReq: DateSpecificRequirement): boolean => {
  return dateReq.timeSlots.every(timeSlot => {
    return timeSlot.roles.every(role => {
      const confirmedCount = getConfirmedStaffCountByDate(
        jobPosting, dateReq.date, timeSlot.time, role.name
      );
      return confirmedCount >= role.count;
    });
  });
};

/**
 * 일자별 요구사항이 있는 공고의 모든 날짜 요구사항이 충족되었는지 확인
 * @param jobPosting 공고 데이터
 * @returns 모든 날짜의 요구사항 충족 여부
 */
export const checkAllDateRequirementsFulfilled = (jobPosting: any): boolean => {
  if (!JobPostingUtils.hasDateSpecificRequirements(jobPosting)) {
    return false; // 일자별 요구사항이 없으면 기존 로직 사용
  }
  
  return jobPosting.dateSpecificRequirements.every((dateReq: DateSpecificRequirement) => {
    return checkDateRequirementsFulfilled(jobPosting, dateReq);
  });
};

/**
 * 기존 timeSlots 기반 요구사항이 모두 충족되었는지 확인
 * @param jobPosting 공고 데이터
 * @returns 기존 요구사항 충족 여부
 */
export const checkTraditionalRequirementsFulfilled = (jobPosting: any): boolean => {
  if (!jobPosting.timeSlots || !Array.isArray(jobPosting.timeSlots)) {
    return false;
  }
  
  // 필요한 인원 수 계산
  const requiredCounts: { [key: string]: number } = {};
  jobPosting.timeSlots.forEach((ts: any) => {
    if (ts.roles && Array.isArray(ts.roles)) {
      ts.roles.forEach((r: any) => {
        const key = `${ts.time}-${r.name}`;
        requiredCounts[key] = r.count;
      });
    }
  });
  
  // 확정된 인원 수 계산
  const confirmedCounts: { [key: string]: number } = (jobPosting.confirmedStaff || []).reduce((acc: any, staff: any) => {
    const key = `${staff.timeSlot}-${staff.role}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  
  // 모든 요구사항이 충족되었는지 확인
  return Object.keys(requiredCounts).every(key => {
    const requiredCount = requiredCounts[key];
    if (requiredCount === undefined) return true;
    return (confirmedCounts[key] || 0) >= requiredCount;
  });
};

/**
 * 공고를 마감해야 하는지 판단
 * @param jobPosting 공고 데이터
 * @returns 마감 여부
 */
export const shouldCloseJobPosting = (jobPosting: any): boolean => {
  if (JobPostingUtils.hasDateSpecificRequirements(jobPosting)) {
    // 일자별 요구사항이 있는 경우
    return checkAllDateRequirementsFulfilled(jobPosting);
  } else {
    // 기존 timeSlots 기반 요구사항인 경우
    return checkTraditionalRequirementsFulfilled(jobPosting);
  }
};

/**
 * 날짜별 확정 스태프 수를 계산하는 헬퍼 함수
 * @param jobPosting 공고 데이터
 * @param date 날짜 (yyyy-MM-dd)
 * @param timeSlot 시간 슬롯
 * @param roleName 역할명
 * @returns 확정 스태프 수
 */
export const getConfirmedStaffCountByDate = (
  jobPosting: any, 
  date: string, 
  timeSlot: string, 
  roleName: string
): number => {
  if (!jobPosting.confirmedStaff || !Array.isArray(jobPosting.confirmedStaff)) {
    return 0;
  }
  
  
  const targetDate = timestampToLocalDateString(date);
  
  return jobPosting.confirmedStaff.filter((staff: any) => {
    const staffDate = timestampToLocalDateString(staff.date);
    return staffDate === targetDate && 
           staff.timeSlot === timeSlot && 
           staff.role === roleName;
  }).length;
};