/**
 * 시스템 공지사항 타입 정의
 *
 * @description
 * 전체 사용자 대상 시스템 공지를 관리하는 타입 정의
 *
 * @version 1.0.0
 * @since 2025-10-25
 */

import { Timestamp } from 'firebase/firestore';

/**
 * 공지사항 우선순위
 */
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

/**
 * 공지사항 상태
 */
export type AnnouncementStatus = 'draft' | 'sending' | 'active' | 'expired' | 'deleted';

/**
 * 시스템 공지사항 인터페이스
 *
 * @description
 * Firestore의 `systemAnnouncements` 컬렉션에 저장되는 문서 구조
 */
export interface SystemAnnouncement {
  /** 공지 고유 ID */
  id: string;

  /** 공지 제목 (최대 100자) */
  title: string;

  /** 공지 내용 (최대 2000자) */
  content: string;

  /** 우선순위 */
  priority: AnnouncementPriority;

  /** 공개 시작일 */
  startDate: Timestamp;

  /** 공개 종료일 (null이면 무기한) */
  endDate: Timestamp | null;

  /** 작성자 User ID */
  createdBy: string;

  /** 작성자 이름 */
  createdByName: string;

  /** 생성 시간 */
  createdAt: Timestamp;

  /** 수정 시간 */
  updatedAt: Timestamp;

  /** 활성 상태 */
  isActive: boolean;

  /** 조회수 */
  viewCount: number;

  /** 전송 결과 */
  sendResult?: {
    /** 전송 성공 수 */
    successCount: number;
    /** 전송 실패 수 */
    failedCount: number;
    /** 전체 사용자 수 */
    totalUsers: number;
    /** 전송 시간 */
    sentAt?: Timestamp;
  };
}

/**
 * 공지사항 생성 입력 데이터
 */
export interface CreateSystemAnnouncementInput {
  /** 공지 제목 */
  title: string;

  /** 공지 내용 */
  content: string;

  /** 우선순위 */
  priority: AnnouncementPriority;

  /** 공개 시작일 */
  startDate: Date;

  /** 공개 종료일 (선택) */
  endDate?: Date | null;
}

/**
 * 공지사항 수정 입력 데이터
 */
export interface UpdateSystemAnnouncementInput {
  /** 공지 제목 */
  title?: string;

  /** 공지 내용 */
  content?: string;

  /** 우선순위 */
  priority?: AnnouncementPriority;

  /** 공개 시작일 */
  startDate?: Date;

  /** 공개 종료일 */
  endDate?: Date | null;

  /** 활성 상태 */
  isActive?: boolean;
}

/**
 * 공지사항 전송 요청 데이터 (Firebase Functions 호출용)
 */
export interface SendSystemAnnouncementRequest {
  /** 공지 ID */
  announcementId: string;

  /** 공지 제목 */
  title: string;

  /** 공지 내용 */
  content: string;

  /** 우선순위 */
  priority: AnnouncementPriority;
}

/**
 * 공지사항 전송 응답 데이터
 */
export interface SendSystemAnnouncementResponse {
  /** 성공 여부 */
  success: boolean;

  /** 공지 문서 ID */
  announcementId?: string;

  /** 전송 결과 */
  result?: {
    successCount: number;
    failedCount: number;
    totalUsers: number;
  };

  /** 에러 메시지 (실패 시) */
  error?: string;
}

/**
 * 공지사항 필터 옵션
 */
export interface SystemAnnouncementFilter {
  /** 우선순위 */
  priority?: AnnouncementPriority;

  /** 활성 상태만 */
  activeOnly?: boolean;

  /** 시작 날짜 */
  startDate?: Date;

  /** 종료 날짜 */
  endDate?: Date;
}

/**
 * 공지사항 유효성 검증
 */
export const validateSystemAnnouncement = (
  input: CreateSystemAnnouncementInput
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 제목 검증
  if (!input.title || input.title.trim().length === 0) {
    errors.push('공지 제목은 필수입니다.');
  } else if (input.title.length > 100) {
    errors.push('공지 제목은 최대 100자까지 입력 가능합니다.');
  }

  // 내용 검증
  if (!input.content || input.content.trim().length === 0) {
    errors.push('공지 내용은 필수입니다.');
  } else if (input.content.length > 2000) {
    errors.push('공지 내용은 최대 2000자까지 입력 가능합니다.');
  }

  // 우선순위 검증
  if (!['normal', 'important', 'urgent'].includes(input.priority)) {
    errors.push('올바른 우선순위를 선택해주세요.');
  }

  // 날짜 검증
  if (!input.startDate) {
    errors.push('공개 시작일은 필수입니다.');
  }

  if (input.endDate && input.startDate) {
    if (input.endDate < input.startDate) {
      errors.push('종료일은 시작일보다 이후여야 합니다.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 우선순위 레이블 가져오기
 */
export const getPriorityLabel = (priority: AnnouncementPriority): string => {
  const labels: Record<AnnouncementPriority, string> = {
    normal: '일반',
    important: '중요',
    urgent: '긴급'
  };
  return labels[priority];
};

/**
 * 우선순위 색상 가져오기 (Tailwind CSS)
 */
export const getPriorityColor = (priority: AnnouncementPriority): string => {
  const colors: Record<AnnouncementPriority, string> = {
    normal: 'blue',
    important: 'orange',
    urgent: 'red'
  };
  return colors[priority];
};

/**
 * 우선순위 배지 스타일 가져오기
 */
export const getPriorityBadgeStyle = (priority: AnnouncementPriority): string => {
  const styles: Record<AnnouncementPriority, string> = {
    normal: 'bg-blue-100 text-blue-800 border border-blue-300',
    important: 'bg-orange-100 text-orange-800 border border-orange-300',
    urgent: 'bg-red-100 text-red-800 border border-red-300'
  };
  return styles[priority];
};
