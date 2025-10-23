/**
 * 동의 관리 Hook
 *
 * @description
 * 사용자 동의 내역 실시간 구독 및 관리
 *
 * @version 1.0.0
 * @since 2025-01-23
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../utils/logger';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import {
  createConsent,
  updateConsent,
  getConsent,
  hasRequiredConsents,
} from '../services/consentService';
import type {
  ConsentRecord,
  ConsentCreateInput,
  ConsentUpdateInput,
} from '../types/consent';

export interface UseConsentReturn {
  // 데이터
  consent: ConsentRecord | null;

  // 상태
  loading: boolean;
  error: Error | null;

  // 계산된 값
  hasRequiredConsents: boolean;
  isMarketingAgreed: boolean;
  isLocationServiceAgreed: boolean;
  isPushNotificationAgreed: boolean;

  // 액션
  createConsent: (input: ConsentCreateInput) => Promise<void>;
  updateMarketing: (agreed: boolean) => Promise<void>;
  updateLocationService: (agreed: boolean) => Promise<void>;
  updatePushNotification: (agreed: boolean) => Promise<void>;
  refreshConsent: () => Promise<void>;
}

/**
 * 동의 관리 Hook
 *
 * @example
 * ```tsx
 * const {
 *   consent,
 *   loading,
 *   hasRequiredConsents,
 *   updateMarketing
 * } = useConsent();
 *
 * // 마케팅 동의 토글
 * await updateMarketing(!consent?.marketing.agreed);
 * ```
 */
export const useConsent = (): UseConsentReturn => {
  const { currentUser } = useAuth();
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Firestore 실시간 구독
   */
  useEffect(() => {
    if (!currentUser) {
      setConsent(null);
      setLoading(false);
      return;
    }

    const consentRef = doc(db, 'users', currentUser.uid, 'consents', 'current');

    const unsubscribe = onSnapshot(
      consentRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as ConsentRecord;
          setConsent(data);
          logger.debug('동의 내역 실시간 업데이트', {
            component: 'useConsent',
            data: { userId: currentUser.uid },
          });
        } else {
          setConsent(null);
          logger.debug('동의 내역 없음', {
            component: 'useConsent',
            data: { userId: currentUser.uid },
          });
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        logger.error('동의 내역 구독 실패', err, {
          component: 'useConsent',
          data: { userId: currentUser.uid },
        });
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  /**
   * 동의 생성
   */
  const handleCreateConsent = useCallback(
    async (input: ConsentCreateInput): Promise<void> => {
      if (!currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        setLoading(true);
        setError(null);
        await createConsent(currentUser.uid, input);
        toast.success('동의 내역이 저장되었습니다.');
      } catch (err) {
        const error = err as Error;
        setError(error);
        logger.error('동의 생성 실패', error, {
          component: 'useConsent',
          data: { userId: currentUser.uid },
        });
        toast.error(error.message || '동의 내역 저장에 실패했습니다.');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  /**
   * 마케팅 동의 업데이트
   */
  const updateMarketing = useCallback(
    async (agreed: boolean): Promise<void> => {
      if (!currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        setError(null);
        const updates: ConsentUpdateInput = {
          marketing: { agreed },
        };
        await updateConsent(currentUser.uid, updates);
        toast.success(
          agreed ? '마케팅 정보 수신에 동의했습니다.' : '마케팅 정보 수신 동의를 철회했습니다.'
        );
      } catch (err) {
        const error = err as Error;
        setError(error);
        logger.error('마케팅 동의 업데이트 실패', error, {
          component: 'useConsent',
          data: { userId: currentUser.uid, agreed },
        });
        toast.error(error.message || '동의 설정 변경에 실패했습니다.');
        throw error;
      }
    },
    [currentUser]
  );

  /**
   * 위치 서비스 동의 업데이트
   */
  const updateLocationService = useCallback(
    async (agreed: boolean): Promise<void> => {
      if (!currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        setError(null);
        const updates: ConsentUpdateInput = {
          locationService: { agreed },
        };
        await updateConsent(currentUser.uid, updates);
        toast.success(
          agreed ? '위치 서비스 이용에 동의했습니다.' : '위치 서비스 이용 동의를 철회했습니다.'
        );
      } catch (err) {
        const error = err as Error;
        setError(error);
        logger.error('위치 서비스 동의 업데이트 실패', error, {
          component: 'useConsent',
          data: { userId: currentUser.uid, agreed },
        });
        toast.error(error.message || '동의 설정 변경에 실패했습니다.');
        throw error;
      }
    },
    [currentUser]
  );

  /**
   * 푸시 알림 동의 업데이트
   */
  const updatePushNotification = useCallback(
    async (agreed: boolean): Promise<void> => {
      if (!currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        setError(null);
        const updates: ConsentUpdateInput = {
          pushNotification: { agreed },
        };
        await updateConsent(currentUser.uid, updates);
        toast.success(
          agreed ? '푸시 알림 수신에 동의했습니다.' : '푸시 알림 수신 동의를 철회했습니다.'
        );
      } catch (err) {
        const error = err as Error;
        setError(error);
        logger.error('푸시 알림 동의 업데이트 실패', error, {
          component: 'useConsent',
          data: { userId: currentUser.uid, agreed },
        });
        toast.error(error.message || '동의 설정 변경에 실패했습니다.');
        throw error;
      }
    },
    [currentUser]
  );

  /**
   * 동의 내역 새로고침
   */
  const refreshConsent = useCallback(async (): Promise<void> => {
    if (!currentUser) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getConsent(currentUser.uid);
      setConsent(data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.error('동의 내역 새로고침 실패', error, {
        component: 'useConsent',
        data: { userId: currentUser.uid },
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * 계산된 값들 (메모이제이션)
   */
  const computedValues = useMemo(() => {
    return {
      hasRequiredConsents: hasRequiredConsents(consent),
      isMarketingAgreed: consent?.marketing?.agreed ?? false,
      isLocationServiceAgreed: consent?.locationService?.agreed ?? false,
      isPushNotificationAgreed: consent?.pushNotification?.agreed ?? false,
    };
  }, [consent]);

  return {
    consent,
    loading,
    error,
    ...computedValues,
    createConsent: handleCreateConsent,
    updateMarketing,
    updateLocationService,
    updatePushNotification,
    refreshConsent,
  };
};
