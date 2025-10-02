/**
 * 알림 관리 Hook
 *
 * @description
 * Firestore 알림 컬렉션을 실시간으로 구독하고 관리하는 Hook
 *
 * @version 1.0.0
 * @since 2025-10-02
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

import { db } from '../firebase';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import type {
  Notification,
  NotificationFilter,
  NotificationStats
} from '../types';

export interface UseNotificationsReturn {
  // 데이터
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats;

  // 상태
  loading: boolean;
  error: Error | null;

  // 액션
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;

  // 필터
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
}

/**
 * 알림 Hook
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, markAsRead } = useNotifications();
 *
 * return (
 *   <div>
 *     <Badge count={unreadCount} />
 *     {notifications.map(notification => (
 *       <NotificationItem
 *         key={notification.id}
 *         notification={notification}
 *         onMarkAsRead={markAsRead}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export const useNotifications = (): UseNotificationsReturn => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>({});

  /**
   * Firestore 타임스탬프를 Date로 변환
   */
  const convertTimestamp = (timestamp: Date | Timestamp): Date => {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return timestamp.toDate();
  };

  /**
   * Firestore 실시간 구독
   */
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    try {
      // Firestore 쿼리 구성
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      // 실시간 구독
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifs: Notification[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt ? convertTimestamp(data.createdAt) : new Date(),
              sentAt: data.sentAt ? convertTimestamp(data.sentAt) : undefined,
              readAt: data.readAt ? convertTimestamp(data.readAt) : undefined,
            } as Notification;
          });

          setNotifications(notifs);
          setLoading(false);

          logger.info('알림 목록 업데이트', {
            data: {
              count: notifs.length,
              unreadCount: notifs.filter(n => !n.isRead).length,
            }
          });
        },
        (err) => {
          logger.error('알림 구독 실패', err);
          setError(err);
          setLoading(false);
        }
      );

      // 클린업
      return () => {
        unsubscribe();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('알림 구독 초기화 실패', error);
      setError(error);
      setLoading(false);
      return undefined;
    }
  }, [currentUser]);

  /**
   * 필터링된 알림 목록
   */
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (filter.isRead !== undefined) {
      filtered = filtered.filter(n => n.isRead === filter.isRead);
    }

    if (filter.category) {
      filtered = filtered.filter(n => n.category === filter.category);
    }

    if (filter.priority) {
      filtered = filtered.filter(n => n.priority === filter.priority);
    }

    if (filter.startDate) {
      filtered = filtered.filter(n => {
        const createdAt = n.createdAt instanceof Date ? n.createdAt : convertTimestamp(n.createdAt);
        return createdAt >= filter.startDate!;
      });
    }

    if (filter.endDate) {
      filtered = filtered.filter(n => {
        const createdAt = n.createdAt instanceof Date ? n.createdAt : convertTimestamp(n.createdAt);
        return createdAt <= filter.endDate!;
      });
    }

    return filtered;
  }, [notifications, filter]);

  /**
   * 읽지 않은 알림 개수
   */
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  /**
   * 알림 통계
   */
  const stats = useMemo((): NotificationStats => {
    const byCategory = notifications.reduce((acc, n) => {
      acc[n.category] = (acc[n.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = notifications.reduce((acc, n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: notifications.length,
      unread: unreadCount,
      byCategory: byCategory as NotificationStats['byCategory'],
      byPriority: byPriority as NotificationStats['byPriority'],
    };
  }, [notifications, unreadCount]);

  /**
   * 알림 읽음 처리
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!currentUser) return;

    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: Timestamp.now(),
      });

      logger.info('알림 읽음 처리', { data: { notificationId } });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('알림 읽음 처리 실패', error, { data: { notificationId } });
      showError('알림 읽음 처리에 실패했습니다.');
    }
  }, [currentUser, showError]);

  /**
   * 모든 알림 읽음 처리
   */
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;

    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) {
      showSuccess('읽지 않은 알림이 없습니다.');
      return;
    }

    try {
      const batch = writeBatch(db);

      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, {
          isRead: true,
          readAt: Timestamp.now(),
        });
      });

      await batch.commit();

      logger.info('모든 알림 읽음 처리', {
        data: { count: unreadNotifications.length }
      });
      showSuccess(`${unreadNotifications.length}개의 알림을 읽음 처리했습니다.`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('모든 알림 읽음 처리 실패', error);
      showError('알림 읽음 처리에 실패했습니다.');
    }
  }, [currentUser, notifications, showSuccess, showError]);

  /**
   * 알림 삭제
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!currentUser) return;

    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);

      logger.info('알림 삭제', { data: { notificationId } });
      showSuccess('알림이 삭제되었습니다.');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('알림 삭제 실패', error, { data: { notificationId } });
      showError('알림 삭제에 실패했습니다.');
    }
  }, [currentUser, showSuccess, showError]);

  /**
   * 읽은 알림 모두 삭제
   */
  const deleteAllRead = useCallback(async () => {
    if (!currentUser) return;

    const readNotifications = notifications.filter(n => n.isRead);
    if (readNotifications.length === 0) {
      showSuccess('읽은 알림이 없습니다.');
      return;
    }

    try {
      const batch = writeBatch(db);

      readNotifications.forEach((notification) => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.delete(notificationRef);
      });

      await batch.commit();

      logger.info('읽은 알림 모두 삭제', {
        data: { count: readNotifications.length }
      });
      showSuccess(`${readNotifications.length}개의 알림이 삭제되었습니다.`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('읽은 알림 삭제 실패', error);
      showError('알림 삭제에 실패했습니다.');
    }
  }, [currentUser, notifications, showSuccess, showError]);

  return {
    // 데이터
    notifications: filteredNotifications,
    unreadCount,
    stats,

    // 상태
    loading,
    error,

    // 액션
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,

    // 필터
    filter,
    setFilter,
  };
};
