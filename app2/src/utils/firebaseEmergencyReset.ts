// Firebase 긴급 재설정 유틸리티
export class FirebaseEmergencyReset {
  private static instance: FirebaseEmergencyReset;
  private resetInProgress = false;

  public static getInstance(): FirebaseEmergencyReset {
    if (!FirebaseEmergencyReset.instance) {
      FirebaseEmergencyReset.instance = new FirebaseEmergencyReset();
    }
    return FirebaseEmergencyReset.instance;
  }

  // 긴급 재설정 실행
  public async emergencyReset(): Promise<void> {
    if (this.resetInProgress) {
      console.log('🔄 Reset already in progress...');
      return;
    }

    this.resetInProgress = true;
    console.log('🚨 Starting Firebase emergency reset...');

    try {
      // 1. 모든 Firebase 리스너 정리
      this.clearAllListeners();
      
      // 2. 브라우저 캐시 클리어
      this.clearBrowserCache();
      
      // 3. Firebase 연결 재설정
      await this.resetFirebaseConnection();
      
      // 4. 페이지 완전 새로고침
      this.forcePageReload();
      
    } catch (error) {
      console.error('❌ Emergency reset failed:', error);
      // 실패 시에도 페이지 새로고침
      this.forcePageReload();
    }
  }

  // 모든 리스너 정리
  private clearAllListeners(): void {
    console.log('🧹 Clearing all Firebase listeners...');
    
    // 전역 이벤트 리스너 정리
    const events = ['beforeunload', 'unload', 'pagehide'];
    events.forEach(event => {
      window.removeEventListener(event, () => {});
    });

    // Firebase 관련 전역 변수 정리
    if ((window as any).firebase) {
      try {
        // Firebase 인스턴스 정리
        delete (window as any).firebase;
      } catch (error) {
        console.warn('Could not clear Firebase instance:', error);
      }
    }
  }

  // 브라우저 캐시 클리어
  private clearBrowserCache(): void {
    console.log('🗑️ Clearing browser cache...');
    
    try {
      // IndexedDB 클리어
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name && db.name.includes('firebase')) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }

      // LocalStorage 클리어
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('firebase') || key.includes('firestore'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // SessionStorage 클리어
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('firebase') || key.includes('firestore'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

    } catch (error) {
      console.warn('Could not clear browser cache:', error);
    }
  }

  // Firebase 연결 재설정
  private async resetFirebaseConnection(): Promise<void> {
    console.log('🔄 Resetting Firebase connection...');
    
    try {
      // Firebase 앱 재초기화를 위한 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Firebase 관련 스크립트 재로드
      this.reloadFirebaseScripts();
      
    } catch (error) {
      console.warn('Firebase connection reset failed:', error);
    }
  }

  // Firebase 스크립트 재로드
  private reloadFirebaseScripts(): void {
    console.log('📜 Reloading Firebase scripts...');
    
    try {
      // Firebase 관련 스크립트 태그 찾기 및 재로드
      const scripts = document.querySelectorAll('script[src*="firebase"]');
      scripts.forEach(script => {
        const src = script.getAttribute('src');
        if (src) {
          script.remove();
          const newScript = document.createElement('script');
          newScript.src = src;
          newScript.async = true;
          document.head.appendChild(newScript);
        }
      });
    } catch (error) {
      console.warn('Could not reload Firebase scripts:', error);
    }
  }

  // 페이지 강제 새로고침
  private forcePageReload(): void {
    console.log('🔄 Force reloading page...');
    
    // 모든 상태 정리 후 새로고침
    setTimeout(() => {
      window.location.href = window.location.href;
    }, 500);
  }

  // 재설정 상태 확인
  public isResetting(): boolean {
    return this.resetInProgress;
  }
}

// 글로벌 인스턴스
export const firebaseEmergencyReset = FirebaseEmergencyReset.getInstance();

// 긴급 재설정 함수
export const emergencyFirebaseReset = async (): Promise<void> => {
  return firebaseEmergencyReset.emergencyReset();
}; 