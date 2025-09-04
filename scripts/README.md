# T-HOLDEM 마이그레이션 스크립트

Firebase applications 컬렉션의 `postId` 필드를 `eventId`로 통일하는 마이그레이션 스크립트입니다.

## 🎯 목적

T-HOLDEM 프로젝트에서 `postId`와 `eventId` 필드가 혼재하여 사용되고 있어 데이터 일관성 문제를 해결합니다.

## 📋 사전 요구사항

1. **Firebase Admin SDK 키**: `firebase-adminsdk-key.json` 파일을 스크립트 디렉토리에 배치
2. **Node.js**: 버전 16 이상
3. **Firebase 프로젝트 접근 권한**: `tholdem-ebc18` 프로젝트

## 🚀 사용법

### 1. 의존성 설치
```bash
cd scripts
npm install
```

### 2. Firebase Admin SDK 키 설정
```bash
# Firebase 콘솔에서 다운로드한 서비스 계정 키를 배치
cp path/to/your/firebase-adminsdk-key.json ./firebase-adminsdk-key.json
```

### 3. 마이그레이션 실행
```bash
# 마이그레이션 실행
npm run migrate

# 또는 직접 실행
node migratePostIdToEventId.js
```

### 4. 롤백 (필요시)
```bash
# 백업 파일을 사용하여 롤백
npm run rollback <백업파일경로>

# 예시
node migratePostIdToEventId.js --rollback applications_backup_2025-02-02T10-30-00-000Z.json
```

## 📊 마이그레이션 과정

1. **현재 상태 분석**: applications 컬렉션의 필드 현황 분석
2. **백업 생성**: 전체 데이터의 JSON 백업 파일 생성
3. **마이그레이션 실행**: 
   - `postId`만 있는 문서 → `eventId` 추가 후 `postId` 제거
   - 두 필드 모두 있는 문서 → `postId` 제거 (eventId 우선)
4. **결과 리포트**: 처리 결과 및 통계 제공

## 🔒 안전 기능

- **자동 백업**: 마이그레이션 전 전체 데이터 백업
- **배치 처리**: Firestore 제한에 맞는 안전한 배치 처리
- **롤백 지원**: 문제 발생 시 원상 복구 가능
- **상세 로깅**: 전 과정 로그 및 오류 추적

## 📁 생성 파일

### 백업 파일
```
applications_backup_YYYY-MM-DDTHH-mm-ss-sssZ.json
```

### 리포트 파일
```json
{
  "timestamp": "2025-02-02T10:30:00.000Z",
  "stats": {
    "totalDocuments": 150,
    "migratedDocuments": 120,
    "skippedDocuments": 25,
    "errorDocuments": 5,
    "errors": [...]
  },
  "migration": "postId_to_eventId",
  "collection": "applications"
}
```

## ⚠️ 주의사항

1. **프로덕션 환경**: 반드시 테스트 환경에서 먼저 실행
2. **백업 확인**: 마이그레이션 전 백업 파일 생성 확인
3. **동시 실행 금지**: 한 번에 하나의 마이그레이션만 실행
4. **서비스 키 보안**: Admin SDK 키 파일을 안전하게 관리

## 🔍 문제 해결

### Firebase 연결 오류
```
Error: Could not load the default credentials
```
→ `firebase-adminsdk-key.json` 파일 경로 확인

### 권한 오류
```
Error: Missing or insufficient permissions
```
→ 서비스 계정에 Firestore 읽기/쓰기 권한 확인

### 배치 크기 초과
→ 스크립트가 자동으로 500개씩 배치 처리

## 📞 지원

- 프로젝트 이슈: T-HOLDEM GitHub Issues
- 긴급 문의: CLAUDE.md 참조