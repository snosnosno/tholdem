import { RoleRequirement, TimeSlot, DateSpecificRequirement, JobPostingTemplate, JobPostingFormData, JobPosting, Benefits } from '../../types/jobPosting';
import { convertToTimestamp, getTodayString } from './dateUtils';
import { logger } from '../logger';

/**
 * 초기 시간대 객체 생성
 */
export const createInitialTimeSlot = (): TimeSlot => ({
  time: '09:00',
  roles: [{ name: 'dealer', count: 1 }],
  isTimeToBeAnnounced: false,
  tentativeDescription: ''
});

/**
 * 초기 폼 데이터 생성
 */
export const createInitialFormData = () => {
  const today = getTodayString();
  
  return {
    title: '',
    type: 'application' as const,
    timeSlots: [createInitialTimeSlot()],
    dateSpecificRequirements: [createNewDateSpecificRequirement(today)],
    description: '',
    status: 'open' as const,
    location: '서울',
    detailedAddress: '',
    district: '',
    preQuestions: [] as any[],
    usesPreQuestions: false,
    startDate: today,
    endDate: today,
    salaryType: 'hourly',
    salaryAmount: '',
    benefits: {} as Benefits
  };
};

/**
 * 새로운 역할 추가
 */
export const createNewRole = (): RoleRequirement => ({
  name: 'dealer',
  count: 1
});

/**
 * 새로운 사전질문 생성
 */
export const createNewPreQuestion = () => ({
  id: Date.now().toString(),
  question: '',
  required: true,
  type: 'text' as const,
  options: []
});

/**
 * 새로운 일자별 요구사항 생성
 */
export const createNewDateSpecificRequirement = (date: string): DateSpecificRequirement => ({
  date,
  timeSlots: [createInitialTimeSlot()]
});

/**
 * 템플릿에서 폼 데이터로 변환
 */
export const templateToFormData = (template: JobPostingTemplate) => {
  const templateData = template.templateData as any;
  return {
    ...templateData,
    startDate: getTodayString(),
    endDate: getTodayString(),
    status: 'open' as const, // 템플릿에서 불러온 공고는 항상 open 상태로 설정
    // 새로운 필드들도 템플릿에서 가져오기
    district: templateData.district || '',
    salaryType: templateData.salaryType,
    salaryAmount: templateData.salaryAmount || '',
    benefits: templateData.benefits || {},
    usesPreQuestions: templateData.usesPreQuestions || false,
    // 역할별 급여 정보도 템플릿에서 가져오기
    useRoleSalary: templateData.useRoleSalary || false,
    roleSalaries: templateData.roleSalaries || {}
  };
};

/**
 * 폼 데이터를 Firebase 저장용으로 변환
 */
export const prepareFormDataForFirebase = (formData: JobPostingFormData) => {
  logger.debug('🔍 prepareFormDataForFirebase 입력 데이터:', { component: 'jobPostingHelpers', data: formData });
  
  // 모든 역할을 수집하여 requiredRoles 배열 생성
  const requiredRoles = new Set<string>();
  
  // 날짜별 요구사항만 사용
  if (formData.dateSpecificRequirements) {
    logger.debug('📅 일자별 요구사항 처리 중...', { component: 'jobPostingHelpers' });
    formData.dateSpecificRequirements.forEach((req: DateSpecificRequirement) => {
      req.timeSlots.forEach((timeSlot: TimeSlot) => {
        timeSlot.roles.forEach((role: RoleRequirement) => {
          if (role.name) {
            requiredRoles.add(role.name);
            logger.debug('👤 역할 추가:', { component: 'jobPostingHelpers', data: role.name });
          }
        });
      });
    });
  }

  const requiredRolesArray = Array.from(requiredRoles);


  const result = {
    ...formData,
    // startDate/endDate는 더 이상 사용하지 않음 - dateSpecificRequirements로 관리
    createdAt: convertToTimestamp(new Date()),
    updatedAt: convertToTimestamp(new Date()),
    requiredRoles: requiredRolesArray, // 검색을 위한 역할 배열 추가
    dateSpecificRequirements: formData.dateSpecificRequirements?.map((req: DateSpecificRequirement) => ({
      ...req,
      date: convertToTimestamp(req.date)
    })) || [],
    // 새로운 필드들 추가 (undefined 값은 Firebase에 저장되지 않음)
    ...(formData.district && { district: formData.district }),
    salaryType: formData.salaryType || 'hourly',
    ...(formData.salaryAmount && { salaryAmount: formData.salaryAmount }),
    // benefits 객체에서 undefined, null, 빈 문자열 값을 제거하고 유효한 필드만 저장
    ...(formData.benefits && (() => {
      const cleanedBenefits = Object.entries(formData.benefits)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      return Object.keys(cleanedBenefits).length > 0 ? { benefits: cleanedBenefits } : {};
    })()),
    // 역할별 급여 정보 추가
    ...(formData.useRoleSalary && { useRoleSalary: formData.useRoleSalary }),
    ...(formData.roleSalaries && Object.keys(formData.roleSalaries).length > 0 && { roleSalaries: formData.roleSalaries })
  };

  logger.debug('🚀 Firebase 저장용 최종 데이터:', { component: 'jobPostingHelpers', data: result });
  return result;
};

/**
 * Firebase 데이터를 폼 데이터로 변환
 */
export const prepareFirebaseDataForForm = (data: Partial<JobPosting>): JobPostingFormData => {
  const convertDate = (dateValue: any): string => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') return dateValue;
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      const date = dateValue.toDate();
      return date.toISOString().split('T')[0] || '';
    }
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0] || '';
    }
    return '';
  };

  return {
    title: data.title || '',
    type: data.type || 'application',
    description: data.description || '',
    location: data.location || '',
    detailedAddress: data.detailedAddress,
    district: data.district,
    // startDate/endDate는 더 이상 사용하지 않음 - dateSpecificRequirements로 관리
    status: data.status || 'open',
    dateSpecificRequirements: (data.dateSpecificRequirements || []).map((req: DateSpecificRequirement) => ({
      ...req,
      date: convertDate(req.date)
    })),
    preQuestions: data.preQuestions,
    requiredRoles: data.requiredRoles,
    salaryType: data.salaryType || 'hourly',
    salaryAmount: data.salaryAmount,
    benefits: data.benefits,
    useRoleSalary: data.useRoleSalary,
    roleSalaries: data.roleSalaries
  } as JobPostingFormData;
};

/**
 * 미리 정의된 역할 목록
 */
export const PREDEFINED_ROLES = [
  'dealer',              // 딜러
  'floor',               // 플로어  
  'serving',             // 서빙
  'tournament_director', // 토너먼트 디렉터
  'chip_master',         // 칩 마스터
  'registration',        // 레지스트레이션
  'security',            // 보안요원
  'cashier',             // 캐셔
  'other'                // 기타 (직접입력)
];

/**
 * 지역 목록
 */
export const LOCATIONS = [
  '서울', '경기', '인천', '강원', '대전', '세종', '충남', '충북', 
  '광주', '전남', '전북', '대구', '경북', '부산', '울산', '경남', '제주', '해외', '기타'
];

/**
 * 역할 이름을 한국어로 변환
 */
export const getRoleDisplayName = (roleName: string): string => {
  const roleMap: Record<string, string> = {
    dealer: '딜러',
    floor: '플로어',
    serving: '서빙',
    tournament_director: '토너먼트 디렉터',
    chip_master: '칩 마스터',
    registration: '레지스트레이션',
    security: '보안요원',
    cashier: '캐셔',
    other: '기타'
  };
  
  return roleMap[roleName] || roleName;
};

/**
 * 공고 상태를 한국어로 변환
 */
export const getStatusDisplayName = (status: string): string => {
  const statusMap: Record<string, string> = {
    open: '모집중',
    closed: '마감',
    draft: '임시저장'
  };
  
  return statusMap[status] || status;
};

/**
 * 공고 타입을 한국어로 변환
 */
export const getTypeDisplayName = (type: string): string => {
  const typeMap: Record<string, string> = {
    application: '지원',
    fixed: '고정'
  };
  
  return typeMap[type] || type;
};

/**
 * 시간대 문자열 생성 (역할과 인원 포함)
 */
export const generateTimeSlotSummary = (timeSlot: TimeSlot): string => {
  if (timeSlot.isTimeToBeAnnounced) {
    return '미정';
  }
  
  const rolesSummary = timeSlot.roles
    .map(role => `${getRoleDisplayName(role.name)} ${role.count}명`)
    .join(', ');
    
  return `${timeSlot.time} (${rolesSummary})`;
};

/**
 * 총 모집 인원 계산
 */
export const calculateTotalPositions = (timeSlots: TimeSlot[]): number => {
  return timeSlots.reduce((total, timeSlot) => {
    return total + timeSlot.roles.reduce((roleTotal, role) => roleTotal + role.count, 0);
  }, 0);
};

/**
 * 일자별 요구사항에서 총 모집 인원 계산
 */
export const calculateTotalPositionsFromDateRequirements = (requirements: DateSpecificRequirement[]): number => {
  return requirements.reduce((total, requirement) => {
    return total + calculateTotalPositions(requirement.timeSlots);
  }, 0);
};

/**
 * 급여 타입을 한국어로 변환
 */
export const getSalaryTypeDisplayName = (type: string): string => {
  const typeMap: Record<string, string> = {
    hourly: '시급',
    daily: '일급',
    monthly: '월급',
    negotiable: '협의',
    other: '기타'
  };
  
  return typeMap[type] || type;
};

/**
 * 급여 정보를 포맷팅하여 표시
 */
export const formatSalaryDisplay = (salaryType?: string, salaryAmount?: string | number): string => {
  if (!salaryType) return '';
  
  if (salaryType === 'negotiable') {
    return '급여 협의';
  }
  
  if (!salaryAmount) return getSalaryTypeDisplayName(salaryType);
  
  const typeName = getSalaryTypeDisplayName(salaryType);
  const amount = String(salaryAmount);
  
  if (salaryType === 'other') {
    return `${typeName}: ${amount}`;
  }
  
  // 숫자에 천 단위 콤마 추가
  const formattedAmount = amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${typeName} ${formattedAmount}원`;
};

/**
 * 역할별 급여 표시 (커스텀 역할명 지원)
 */
export const formatRoleSalaryDisplay = (
  role: string, 
  salary: { salaryType: string; salaryAmount: string; customRoleName?: string }
): string => {
  const roleName = role === 'other' && salary.customRoleName 
    ? salary.customRoleName 
    : getRoleDisplayName(role);
  
  const salaryText = formatSalaryDisplay(salary.salaryType, salary.salaryAmount);
  return `${roleName}: ${salaryText}`;
};

/**
 * 역할별 급여 목록 표시
 */
export const formatRoleSalariesDisplay = (roleSalaries?: Record<string, any>): string => {
  if (!roleSalaries || Object.keys(roleSalaries).length === 0) return '';
  
  return Object.entries(roleSalaries)
    .map(([role, salary]) => formatRoleSalaryDisplay(role, salary))
    .join(' | ');
};

/**
 * 특정 역할의 급여 가져오기
 */
export const getRoleSalary = (roleSalaries?: Record<string, any>, role?: string): string => {
  if (!roleSalaries || !role) return '';
  const salary = roleSalaries[role];
  if (!salary) return '';
  return formatSalaryDisplay(salary.salaryType, salary.salaryAmount);
};

/**
 * 복리후생 정보를 한국어로 변환하여 배열로 반환
 */
export const getBenefitDisplayNames = (benefits?: Benefits | Record<string, string>): string[] => {
  if (!benefits) return [];
  
  const benefitMap: Record<string, string> = {
    guaranteedHours: '보장',
    clothing: '복장',
    meal: '식사',
    transportation: '교통비',
    mealAllowance: '식비',
    accommodation: '숙소'
  };
  
  // 정해진 순서대로 정렬
  const benefitOrder = ['guaranteedHours', 'clothing', 'meal', 'transportation', 'mealAllowance', 'accommodation'];
  
  const sortedBenefits = benefitOrder
    .filter(key => key in benefits && benefits[key as keyof typeof benefits])
    .map(key => `${benefitMap[key]}: ${benefits[key as keyof typeof benefits]}`);
  
  return sortedBenefits;
};

/**
 * 복리후생 정보를 2줄로 나누어 반환 (첫줄: 보장, 식비, 교통비 / 둘째줄: 복장, 식사, 숙소)
 */
export const getBenefitDisplayGroups = (benefits?: Benefits | Record<string, string>): string[][] => {
  if (!benefits) return [];
  
  const benefitMap: Record<string, string> = {
    guaranteedHours: '보장',
    mealAllowance: '식비',
    transportation: '교통비',
    clothing: '복장',
    meal: '식사',
    accommodation: '숙소'
  };
  
  // 첫 번째 줄: 보장, 식비, 교통비
  const firstLineKeys = ['guaranteedHours', 'mealAllowance', 'transportation'];
  const firstLine = firstLineKeys
    .filter(key => key in benefits && benefits[key as keyof typeof benefits])
    .map(key => `${benefitMap[key]}: ${benefits[key as keyof typeof benefits]}`);
  
  // 두 번째 줄: 복장, 식사, 숙소
  const secondLineKeys = ['clothing', 'meal', 'accommodation'];
  const secondLine = secondLineKeys
    .filter(key => key in benefits && benefits[key as keyof typeof benefits])
    .map(key => `${benefitMap[key]}: ${benefits[key as keyof typeof benefits]}`);
  
  const groups: string[][] = [];
  
  // 첫 번째 줄이 있으면 추가
  if (firstLine.length > 0) {
    groups.push(firstLine);
  }
  
  // 두 번째 줄이 있으면 추가
  if (secondLine.length > 0) {
    groups.push(secondLine);
  }
  
  return groups;
};