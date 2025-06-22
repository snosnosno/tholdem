import db from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const logsCollection = collection(db, 'action_logs');

/**
 * 액션 로그를 Firestore에 기록하는 함수
 * @param action - 기록할 액션의 종류 (예: 'table_closed', 'participant_added')
 * @param details - 액션에 대한 상세 정보 객체
 */
export const logAction = async (action: string, details: object) => {
  try {
    await addDoc(logsCollection, {
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging action:", error);
    // 실제 프로덕션에서는 Sentry 등의 에러 리포팅 서비스로 전송하는 것을 고려
  }
};

/**
 * 액션 로깅 기능을 제공하는 커스텀 훅
 * @returns logAction 함수
 */
export const useLogger = () => {
  return { logAction };
}; 