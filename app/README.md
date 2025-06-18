# 홀덤 토너먼트 운영 플랫폼

## 프로젝트 개요
- 실시간 참가자/테이블/칩/블라인드/상금 관리, 기록, 운영자·참가자용 UI 제공
- React + Tailwind + Firebase 기반, 모바일/PC 대응

## 설치 및 환경설정
1. Node.js 18+ 설치
2. Firebase 프로젝트 생성 및 Firestore/Authentication/Hosting 활성화
3. `app/src/firebase.ts`에 Firebase 설정 입력
4. 의존성 설치:
   ```bash
   cd app
   npm install
   ```

## 개발/실행/배포
- 개발 서버: `npm start` (http://localhost)
- 프로덕션 빌드: `npm run build`
- Firebase Hosting 배포: `firebase deploy` (사전 로그인 필요)

## 주요 기능
- 관리자 인증/로그인, 참가자 관리, 테이블/좌석 배정, 칩/블라인드/타이머, 상금 계산, 기록/히스토리, 실시간 참가자 페이지, 직원/권한 관리

## 운영자 가이드
- 관리자 로그인 후 각 기능별 UI에서 실시간 관리 가능
- 직원(딜러/운영자) 관리: StaffManager 메뉴에서 CRUD 및 역할 구분
- 참가자용 페이지: 모바일/PC 모두 지원, 실시간 정보 제공
- 기록/히스토리: PDF/Excel 내보내기 지원(향후 확장)

## 문제 해결
- Firestore/Firebase 인증 오류: firebase.ts 설정, Firebase 콘솔 규칙 확인
- 빌드/배포 오류: Node/Firebase CLI 버전, 환경변수, 로그 확인
- 기타 문의: logs/ 폴더 내 로그 참고

## 테스트 및 점검
- 주요 기능별 수동 테스트 권장(참가자 추가/삭제, 테이블 배정, 칩/블라인드 변경, 상금 계산 등)
- 배포 전 운영자/참가자 시나리오별 점검 필수

---
문의: 운영팀 또는 개발 담당자