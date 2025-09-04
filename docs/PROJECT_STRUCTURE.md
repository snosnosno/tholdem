# 📁 T-HOLDEM 프로젝트 구조

**최종 업데이트**: 2025년 2월 2일  
**프로젝트 버전**: 5.0.0  
**상태**: 🏆 **Week 4 성능 최적화 완료 - 100% 완성**

## 🏗️ 전체 디렉토리 구조

```
T-HOLDEM/
├── 📱 app2/                        # 메인 React 애플리케이션
├── 📚 docs/                        # 프로젝트 문서
├── ⚙️ scripts/                     # 유틸리티 스크립트
├── 🔥 functions/                   # Firebase Functions
├── 📝 설정 파일들                   # 프로젝트 설정
├── 📄 README.md                    # 프로젝트 소개
├── 📄 CLAUDE.md                    # 개발 가이드
└── 📄 CHANGELOG.md                 # 변경 이력

```

## 📱 메인 애플리케이션 (app2/)

### 소스 코드 구조 (src/)

```
app2/src/
├── 🧩 components/                  # 재사용 가능한 컴포넌트
│   ├── common/                     # 공통 UI 컴포넌트
│   │   ├── Badge.tsx               # 배지 컴포넌트
│   │   ├── Button.tsx              # 버튼 컴포넌트
│   │   ├── Card.tsx                # 카드 컴포넌트
│   │   ├── Input.tsx               # 입력 컴포넌트
│   │   └── JobPostingCardNew.tsx   # 구인공고 카드
│   │
│   ├── staff/                      # 스태프 관련 모듈화 컴포넌트
│   │   ├── StaffCardHeader.tsx     # 스태프 헤더
│   │   ├── StaffCardTimeSection.tsx # 시간 관리
│   │   ├── StaffCardActions.tsx    # 액션 메뉴
│   │   └── StaffCardContactInfo.tsx # 연락처 정보
│   │
│   ├── payroll/                    # 급여 관련 컴포넌트 ✨
│   │   ├── AllowanceEditModal.tsx  # 수당 편집 모달
│   │   └── BulkAllowancePanel.tsx  # 일괄 수당 패널
│   │
│   ├── jobPosting/                 # 구인공고 관련
│   │   ├── JobPostingForm.tsx      # 공고 작성 폼
│   │   ├── JobPostingList.tsx      # 공고 목록
│   │   └── modals/                 # 모달 컴포넌트
│   │
│   ├── applicants/                 # 지원자 관련
│   │   └── ApplicantListTab/       # 지원자 목록 탭
│   │
│   ├── tabs/                       # 탭 컴포넌트
│   │   ├── EnhancedPayrollTab.tsx  # 정산 탭 ✨
│   │   └── StaffManagementTab.tsx  # 스태프 관리 탭
│   │
│   └── ui/                         # UI 기본 컴포넌트
│       ├── Modal.tsx               # 모달
│       ├── Toast.tsx               # 토스트
│       └── Loading.tsx             # 로딩 스피너
│
├── 📄 pages/                        # 페이지 컴포넌트
│   ├── JobBoardPage.tsx            # 구인구직 게시판
│   ├── JobPostingDetailPage.tsx    # 공고 상세
│   ├── StaffNewPage.tsx            # 스태프 관리
│   ├── AttendancePage.tsx          # 출석 관리
│   ├── admin/                      # 관리자 페이지
│   │   ├── CEODashboard.tsx        # CEO 대시보드
│   │   └── UserManagementPage.tsx  # 사용자 관리
│   └── JobBoard/                   # 모듈화된 구인게시판
│       ├── components/             # 하위 컴포넌트
│       ├── hooks/                  # 커스텀 훅
│       └── utils/                  # 유틸리티
│
├── 🎣 hooks/                        # 커스텀 훅
│   ├── useStaffManagement.ts       # 스태프 관리
│   ├── useAttendanceStatus.ts      # 출석 상태
│   ├── useUnifiedWorkLogs.ts       # 통합 WorkLog 관리
│   ├── useEnhancedPayroll.ts       # 정산 관리
│   ├── useJobPostings.ts           # 구인공고
│   └── usePermissions.ts           # 권한 관리
│
├── 🗂️ types/                        # TypeScript 타입 정의
│   ├── attendance.ts               # 출석 관련 타입
│   ├── payroll.ts                  # 정산 관련 타입
│   ├── jobPosting/                 # 구인공고 타입
│   └── unified/                    # 통합 타입
│       └── workLog.ts              # 작업 로그 타입
│
├── 🛠️ utils/                        # 유틸리티 함수
│   ├── logger.ts                   # 구조화된 로깅 시스템
│   ├── performanceMonitor.ts       # 성능 모니터링
│   ├── dateUtils.ts                # 날짜 처리 (한글 형식)
│   ├── workLogUtils.ts             # 작업 로그 유틸리티
│   ├── firebaseConnectionManager.ts # Firebase 연결 관리
│   └── security/                   # 보안 관련
│       ├── csrf.ts                 # CSRF 토큰
│       └── sanitizer.ts            # XSS 방지
│
├── 📦 stores/                       # Zustand 스토어
│   ├── toastStore.ts               # 토스트 상태
│   ├── jobPostingStore.ts          # 구인공고 상태
│   └── tournamentStore.ts          # 토너먼트 상태
│
├── 🌐 contexts/                     # Context API
│   ├── AuthContext.tsx             # 인증 컨텍스트
│   └── TournamentContext.tsx       # 토너먼트 컨텍스트
│
├── 🔥 firebase.ts                   # Firebase 설정
├── 🌍 i18n.ts                       # 다국어 설정
└── 📊 App.tsx                       # 메인 앱 컴포넌트
```

### 설정 파일

```
app2/
├── package.json                    # 의존성 관리
├── tsconfig.json                   # TypeScript 설정
├── tailwind.config.js              # Tailwind CSS 설정
├── postcss.config.js               # PostCSS 설정
├── .env                            # 환경 변수 (Git 제외)
└── .env.example                    # 환경 변수 예시
```

## 📚 문서 (docs/)

```
docs/
├── README.md                       # 문서 인덱스
├── PRODUCT_SPEC.md                 # 통합 제품 사양
├── PROJECT_STRUCTURE.md           # 프로젝트 구조 (현재 문서)
├── FIREBASE_DATA_FLOW.md           # 데이터베이스 구조
├── TECHNICAL_DOCUMENTATION.md      # 기술 문서
├── DEPLOYMENT.md                   # 배포 가이드 ✨
├── TESTING_GUIDE.md                # 테스트 가이드 ✨
├── API_DOCUMENTATION.md            # API 문서 ✨
└── archive/                        # 아카이브된 문서
    └── 2025-01/                    # 완료된 문서
```

## 🔥 Firebase 구조

### Firestore Collections

```
firestore/
├── 👤 users/                       # 사용자 정보
├── 📝 jobPostings/                 # 구인공고
├── 📋 applications/                # 지원 정보
├── 👥 staff/                       # 스태프 기본 정보
├── ⏰ workLogs/                    # 근무 기록 (핵심) ✨
├── ✅ attendanceRecords/           # 출석 기록
├── 🎮 tournaments/                 # 토너먼트 정보
├── 👫 participants/                # 참가자 정보
└── 🏆 events/                      # 이벤트 정보
```

### Firebase Functions

```
functions/
├── src/
│   └── index.ts                   # 서버리스 함수 (최소 사용)
├── package.json                    # Functions 의존성
└── tsconfig.json                   # TypeScript 설정
```

## 🧪 테스트 구조

```
app2/src/
├── __tests__/                      # 테스트 파일
│   └── setup/
│       └── test-utils.tsx          # 테스트 유틸리티
├── components/__tests__/           # 컴포넌트 테스트
├── hooks/__tests__/                # 훅 테스트
├── pages/__tests__/                # 페이지 테스트
└── setupTests.ts                   # 테스트 설정
```

## ⚙️ 스크립트

```
scripts/
├── firebase-migration/             # Firebase 마이그레이션
│   ├── README.md                   # 마이그레이션 가이드
│   ├── backup-firestore-admin.ts   # Admin SDK 백업
│   ├── migrate-fields-admin.ts     # 필드 마이그레이션
│   └── restore-firestore.ts        # Firestore 복원
└── archive/                        # 완료된 스크립트 보관
```

## 📊 주요 기술 스택

| 카테고리 | 기술 | 버전 | 용도 |
|---------|------|------|------|
| **Frontend** | React | 18.3.1 | UI 프레임워크 |
| **Language** | TypeScript | 5.x | 타입 안전성 |
| **Styling** | Tailwind CSS | 3.4.1 | 스타일링 |
| **Backend** | Firebase | 11.x | 백엔드 서비스 |
| **State** | Zustand | 5.x | 상태 관리 |
| **Table** | @tanstack/react-table | 8.x | 테이블 컴포넌트 |
| **Icons** | @heroicons/react | 2.x | 아이콘 |
| **Testing** | Jest | 29.x | 테스트 프레임워크 |
| **Monitoring** | Sentry | 8.x | 에러 추적 |

## 🚀 최근 변경사항 (2025-01-30)

### ✅ 완료된 작업
- **문서 구조 정리**: 
  - 새 문서 생성: DEPLOYMENT.md, TESTING_GUIDE.md, API_DOCUMENTATION.md
  - 완료된 문서 아카이브로 이동
  - scripts 폴더 정리 및 불필요한 파일 제거
- **UI/UX 개선**:
  - 스태프 프로필 모달 기능 추가
  - 헤더에 출석체크 버튼 추가
  - 날짜별 그룹화 기본 설정 (플랫 리스트 제거)
- **코드 최적화**:
  - 172줄의 불필요한 플랫 리스트 코드 제거
  - 레거시 필드 100% 제거 완료
  - TypeScript 에러 0개 유지

### 🔄 데이터 흐름
1. **Firebase Firestore** → 실시간 데이터
2. **onSnapshot 구독** → 자동 동기화
3. **Custom Hooks** → 데이터 처리
4. **Zustand/Context** → 상태 관리
5. **React Components** → UI 렌더링

### 📈 성능 지표
- **번들 크기**: 273KB (gzipped)
- **초기 로딩**: 2.0초
- **Lighthouse 점수**: 91/100
- **의존성**: 43개 패키지 (69% 감소)

---

*이 문서는 프로젝트의 현재 구조를 반영합니다. 변경사항이 있을 시 업데이트가 필요합니다.*