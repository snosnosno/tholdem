# Development Guidelines

## Project Overview

- 본 프로젝트는 홀덤 토너먼트 운영 플랫폼으로, 작업 자동화 및 관리 기능을 포함한다.
- 주요 기술 스택, 아키텍처, 폴더 구조, AI 작업 규칙을 명확히 정의한다.
- 일반적인 개발 지식은 포함하지 않는다. 오직 본 프로젝트에 특화된 규칙만 명시한다.

## Project Architecture

- 프로젝트 루트에는 SHRIMP/, shrimp-rules.md, 홀덤 토너먼트 운영 플랫폼 개발 계획서.pdf 등이 존재한다.
- SHRIMP/: 작업 관리 및 자동화 관련 소스 코드와 템플릿이 위치한다.
  - generators/: 작업 생성 및 관리 코드
  - templates_en/: 영어 템플릿
  - templates_zh/: 중국어 템플릿
- shrimp-rules.md: AI 전용 개발 표준 문서

## Key Rules Framework

- 모든 파일/폴더 작업 전 반드시 해당 위치와 역할을 재확인할 것
- edit_file_lines 사용 시, 항상 편집 전후 라인 및 인접 코드 확인 필수
- 다국어 템플릿(templates_en, templates_zh) 수정 시, 양쪽 모두 동기화 필요
- 금지사항, 예시, 의사결정 기준 등은 아래 섹션에 별도 명시

## 홀덤 토너먼트 운영 플랫폼 AI Agent 개발 표준

### 1. 프로젝트 개요
- 본 프로젝트는 홀덤 토너먼트 운영 플랫폼의 AI 기반 자동화 및 관리 기능 개발을 목적으로 한다.
- 모든 작업은 AI Agent가 자동화 방식으로 수행한다.

### 2. 프로젝트 아키텍처
- 루트 디렉터리: 모든 소스, 설정, 로그, 문서가 이곳에 위치해야 한다.
- logs/ 폴더: 모든 실행 및 오류 로그는 반드시 logs/ 폴더에 저장한다.
- shrimp-rules.md: 본 표준 문서는 루트에 위치해야 한다.

### 3. 코드 및 파일 작업 표준
- 파일 생성, 수정, 삭제 시 반드시 edit_file_lines를 사용한다.
- edit_file_lines 사용 전후, 반드시 해당 라인 및 인접 라인을 확인한다.
- 파일 작업 후 반드시 git add 및 git commit을 수행한다.
- 파일 삭제 시 git rm 및 commit을 반드시 사용한다.
- 브랜치 전략: test 브랜치에서 충분히 검증 후 master에 병합한다.
- 로그 파일은 logs/ 폴더에만 기록한다.
- DB 연동 시 계정, 호스트, DB명을 명확히 명시한다.
- 예시: 
  - 파일 생성 후: edit_file_lines → git add → git commit
  - 파일 삭제: git rm → git commit
  - edit_file_lines 사용 전: 해당 라인 및 인접 라인 확인

### 4. 금지사항
- 임의로 작업을 진행하지 않는다. 반드시 사용자 동의를 받는다.
- 일반적인 개발 지식, 설명, 튜토리얼을 포함하지 않는다.
- 불필요한 파일, 폴더, 로그를 생성하지 않는다.
- 프로젝트 외부 파일을 참조하거나 수정하지 않는다. 

### 5. 외부 라이브러리 및 플러그인 사용 기준
- React, Tailwind CSS, Firebase, Firestore, Cloud Functions 등 주요 라이브러리는 공식 문서 기준으로만 사용한다.
- 외부 라이브러리 추가 시 반드시 package.json에 명시하고, 불필요한 의존성은 제거한다.
- 날짜/시간은 Luxon 또는 Day.js, PDF/Excel 출력은 jsPDF, SheetJS 등 검증된 라이브러리만 도입한다.
- 외부 라이브러리 업데이트 시 반드시 호환성 테스트를 거친다.
- 예시: npm install react, npm install tailwindcss

### 6. 워크플로우 및 데이터 흐름
- 모든 기능 개발은 test 브랜치에서 시작한다.
- 기능별로 세부 작업(Task) 단위로 분리하여 순차적으로 진행한다.
- 각 Task 완료 시 반드시 코드 리뷰 및 테스트를 거친다.
- Firestore 데이터 구조는 컬렉션-도큐먼트 계층을 준수한다.
- 실시간 동기화, 트랜잭션, 보안 규칙 등은 Firebase 공식 가이드에 따라 구현한다.
- 예시: 참가자 추가 → Firestore participants 컬렉션에 문서 생성 → 실시간 UI 반영

### 7. 주요 파일 상호작용 및 동시 수정 규칙
- README.md, shrimp-rules.md, Firestore 보안 규칙 등 주요 문서 변경 시 반드시 관련 문서(예: /docs/README.md)도 동시 수정한다.
- 데이터베이스 구조 변경 시, 관련 Cloud Functions 및 UI 코드도 함께 수정한다.
- 예시: Firestore participants 구조 변경 → 관련 Cloud Function, 참가자 관리 UI 동시 수정

### 8. AI 의사결정 기준 및 우선순위
- 파일 생성/수정/삭제 시 항상 최신 라인 정보를 확인한다.
- ambiguous(모호) 상황 발생 시, 프로젝트 계획서와 shrimp-rules.md를 최우선으로 참조한다.
- 여러 파일을 동시에 수정해야 할 경우, 의존성 높은 파일부터 순차적으로 처리한다.
- 사용자 동의 없는 임의 작업, 불필요한 리팩터링, 설명 추가 등은 금지한다.
- 예시: edit_file_lines로 participants.js 수정 전, 해당 라인 및 인접 라인 확인 → git add/commit

### 9. 구체적 예시 및 금지사항 보강
- [허용] edit_file_lines로 참가자 관리 기능 추가, git add/commit, Firestore 구조 동시 수정
- [허용] logs/ 폴더에만 로그 기록, test 브랜치에서 충분히 검증 후 master 병합
- [금지] 사용자 동의 없는 임의 작업, 불필요한 파일/폴더/로그 생성, 외부 파일 참조/수정, 일반 개발 지식 포함
- [금지] edit_file_lines 사용 시 라인 확인 없이 바로 수정, 관련 파일 동시 수정 누락

### 10. 기타
- 모든 규칙은 프로젝트 진행 중 필요에 따라 보완될 수 있다.
- 규칙 변경 시 반드시 shrimp-rules.md를 최신 상태로 유지한다. 