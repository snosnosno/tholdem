# T-Holdem Tournament Management Platform

This is a web application for managing Texas Hold'em tournaments, built with React, TypeScript, Tailwind CSS, and Firebase.

## 🎯 Recent Updates (2025.01.31)

- ✅ **TypeScript Strict Mode**: 완전한 타입 안전성 적용
- ✅ **Bundle Size Optimization**: 44% 크기 감소 (1.6MB → 890KB)
- ✅ **Performance Improvement**: 초기 로딩 43% 개선 (3.5s → 2.0s)
- ✅ **State Management**: Context API → Zustand 마이그레이션
- ✅ **Security Enhancement**: 환경 변수 기반 API 키 관리

## Features

-   **Admin-only access**: Secure login for tournament staff.
-   **Participant Management**: Register, update, and track players.
-   **Table and Seat Management**: Automated table and seat assignments.
-   **Chip and Blind Management**: Real-time tracking of chip counts, blind levels, and timers.
-   **Prize Calculation**: Automated prize pool calculation and distribution.
-   **Tournament History**: View past tournament results and statistics.
-   **Live Information for Players**: A dedicated page for players to see live tournament data.
-   **Staff Management**: Manage staff roles and permissions.

## Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS
-   **Backend & DB**: Firebase (Authentication, Firestore)
-   **Deployment**: Firebase Hosting (or Vercel, etc.)

## Getting Started

### Prerequisites

-   Node.js and npm
-   A Firebase project

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    ```bash
    # Copy the example environment file
    cp .env.example .env
    
    # Edit .env and add your Firebase configuration
    # You can find these values in Firebase Console > Project Settings
    ```
4.  Configure Firebase:
    - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
    - Enable Authentication, Firestore, and Storage
    - Copy your Firebase configuration to `.env` file
5.  Start the development server:
    ```bash
    npm start
    ```

### Environment Variables

This project uses environment variables for configuration. Never commit the `.env` file to version control!

#### Required Variables:
```env
REACT_APP_FIREBASE_API_KEY          # Firebase API Key
REACT_APP_FIREBASE_AUTH_DOMAIN      # Firebase Auth Domain
REACT_APP_FIREBASE_PROJECT_ID       # Firebase Project ID
REACT_APP_FIREBASE_STORAGE_BUCKET   # Firebase Storage Bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID  # Firebase Messaging Sender ID
REACT_APP_FIREBASE_APP_ID          # Firebase App ID
REACT_APP_FIREBASE_MEASUREMENT_ID  # Firebase Measurement ID (optional)
```

#### Security Best Practices:
- ⚠️ **Never commit `.env` file to Git**
- ⚠️ **Use server environment variables in production**
- ⚠️ **Rotate API keys regularly**
- ⚠️ **If keys are exposed, regenerate them immediately in Firebase Console**

## Available Scripts

### `npm start`

Runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm run build`

Builds the app for production to the `build` folder.
This creates an optimized build ready for deployment.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run analyze:bundle`

번들 크기를 분석하고 시각화합니다.
```bash
npm run analyze:bundle
```

### `npm run analyze:interactive`

웹 브라우저에서 인터랙티브한 번들 분석을 제공합니다.
```bash
npm run analyze:interactive
```

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## 📚 Documentation

### Quick Links

- **[최적화 가이드](./docs/OPTIMIZATION_GUIDE.md)**: 번들 최적화, 성능 개선 전략
- **[마이그레이션 가이드](./docs/MIGRATION_GUIDES.md)**: 라이브러리 교체, TypeScript Strict Mode
- **[기술 보고서](./docs/TECHNICAL_REPORTS.md)**: 성능 분석, 기술 스택 평가, 로드맵

### Documentation Structure

```
docs/
├── OPTIMIZATION_GUIDE.md      # 번들 분석, 최적화 전략, 성능 측정
├── MIGRATION_GUIDES.md        # 라이브러리 마이그레이션, TypeScript 가이드
├── TECHNICAL_REPORTS.md       # 기술 분석, 성능 보고서, 향후 계획
└── archive/                   # 이전 개별 문서들 (참고용)
```

### Key Technologies

- **Frontend Framework**: React 18 with TypeScript (Strict Mode)
- **State Management**: Zustand (마이그레이션 완료)
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Functions, Storage)
- **Performance**: 
  - Custom lightweight components
  - Dynamic imports for code splitting
  - Optimized bundle size (~280KB gzipped)

### Performance Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Bundle Size | <300KB | 280KB | ✅ |
| LCP | <2.5s | 2.1s | ✅ |
| FID | <100ms | 80ms | ✅ |
| CLS | <0.1 | 0.05 | ✅ |

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
