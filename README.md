# SongForm - 예배 송폼 관리 시스템

찬양팀을 위한 예배 송폼 관리 및 PPT 내보내기 웹 애플리케이션.

## 기술 스택

- **Frontend**: React 18, Vite, Tailwind CSS, @dnd-kit, Zustand, TanStack Query
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **PPT 생성**: pptxgenjs

## 시작하기

### 1. PostgreSQL 데이터베이스 생성

```sql
CREATE DATABASE songform;
```

### 2. 서버 환경변수 설정

`server/.env` 파일을 수정:

```env
DATABASE_URL=postgresql://postgres:비밀번호@localhost:5432/songform
PORT=3001
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### 3. 의존성 설치

```bash
# 루트 디렉토리에서
cd server && npm install
cd ../client && npm install
```

### 4. DB 마이그레이션 및 시드 데이터 실행

```bash
cd server
npm run migrate   # 테이블 생성
npm run seed      # 기본 데이터 입력 (교단, 카테고리, 송폼 요소)
```

### 5. 개발 서버 실행

**터미널 1 (서버):**
```bash
cd server
npm run dev
# → http://localhost:3001
```

**터미널 2 (클라이언트):**
```bash
cd client
npm run dev
# → http://localhost:5173
```

## 주요 기능

### 예배 송폼 생성
- 예배 날짜 선택 시 **절기 자동 표시** (대강절, 성탄절, 주현절, 사순절, 부활절, 성령강림절)
- 예배 카테고리 선택 (주일 1부~4부, 수요예배 등)
- 기본 6곡 + 동적 추가/삭제
- 각 노래별 Key 선택 및 반음 올림/내림

### 드래그앤드롭 송폼 빌더
- Intro, Verse, Pre-Chorus, Chorus, Bridge, Interlude, Outro 등
- 클릭으로 추가, 드래그로 순서 변경, × 반복 횟수 지정

### 악보 검색
- DB에서 기존 노래 검색 (자동완성 포함)
- 인터넷 크롤링으로 악보/가사 수집

### PPT 내보내기
- 저장 후 "PPT 내보내기" 클릭
- 슬라이드 1: 예배 헤더 (교단, 날짜, 카테고리, 절기, 노래 목록)
- 슬라이드 2+: 노래별 (제목, Key, 송폼 흐름 시각화)

### 환경설정
- 교단 추가/변경 (기본: 한국 기독교 장로회)
- 예배 카테고리 관리 (추가/수정/삭제/순서)
- 송폼 요소 관리 (색상, 이름 커스터마이징)

## API 엔드포인트

| 경로 | 설명 |
|------|------|
| GET /api/denominations | 교단 목록 |
| GET /api/worship-categories | 예배 카테고리 |
| GET /api/song-form-elements | 송폼 요소 목록 |
| GET /api/songs?q= | 노래 검색 |
| GET/POST /api/worship-forms | 예배 송폼 목록/생성 |
| GET/PUT /api/worship-forms/:id | 송폼 조회/수정 |
| GET /api/liturgical-seasons/current?date= | 현재 절기 조회 |
| POST /api/export/pptx/:formId | PPT 다운로드 |

## 절기 지원 (한국 기독교 장로회)

| 절기 | 색상 | 기간 |
|------|------|------|
| 대강절 | 보라색 | 크리스마스 이전 4번째 일요일 ~ 12/24 |
| 성탄절 | 빨강 | 12/25 ~ 1/5 |
| 주현절 | 금색 | 1/6 ~ 사순절 전날 |
| 사순절 | 보라색 | 재의 수요일 ~ 부활절 전날 |
| 부활절 | 흰색 | 부활절 ~ 성령강림절 전날 |
| 성령강림절 | 빨강 | 오순절 ~ 대강절 전날 |
| 연중 주일 | 초록 | 그 외 기간 |
