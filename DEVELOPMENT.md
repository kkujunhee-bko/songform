# SongForm 개발 문서

> 찬양팀 예배 송폼 관리 + PPT 내보내기 웹 애플리케이션  
> 최종 업데이트: 2026-04-10

---

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [DB 스키마](#4-db-스키마)
5. [API 목록](#5-api-목록)
6. [주요 기능](#6-주요-기능)
7. [권한 관리 시스템](#7-권한-관리-시스템)
8. [실행 방법](#8-실행-방법)
9. [개발 이력](#9-개발-이력)

---

## 1. 프로젝트 개요

찬양팀이 매주 예배 순서(송폼)를 체계적으로 관리하고, 악보를 연결하며, PPT로 출력할 수 있는 로컬 웹 애플리케이션입니다.

### 핵심 목표
- 예배별 찬양 순서 · 키 · 송폼 흐름 관리
- 네이버 이미지 검색 또는 직접 업로드로 악보 연결
- 키(Key) 선택 → PPT 자동 생성
- 역할별 접근 권한 관리

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **상태 관리** | Zustand, TanStack Query (React Query) |
| **드래그&드롭** | @dnd-kit/core, @dnd-kit/sortable |
| **Backend** | Node.js, Express (CommonJS) |
| **DB** | PostgreSQL |
| **인증** | JWT (jsonwebtoken), bcryptjs |
| **PPT 생성** | pptxgenjs |
| **HTTP 클라이언트** | axios |

---

## 3. 프로젝트 구조

```
D:/Project/SongForm/
├── server/                          # Express API 서버 (포트 3001)
│   └── src/
│       ├── app.js                   # Express 앱 설정, 미들웨어, 라우트 등록
│       ├── index.js                 # 서버 진입점
│       ├── config/
│       │   └── db.js                # PostgreSQL Pool 설정
│       ├── db/
│       │   ├── migrate.js           # 마이그레이션 실행기
│       │   ├── seed.js              # 시드 데이터 실행기
│       │   ├── initAdmin.js         # 초기 관리자 계정 생성
│       │   ├── migrations/          # SQL 마이그레이션 파일
│       │   │   ├── 001_initial_schema.sql
│       │   │   ├── 002_add_sheet_music_url_to_wfs.sql
│       │   │   ├── 003_add_users.sql
│       │   │   ├── 004_add_leaders_to_worship_forms.sql
│       │   │   ├── 005_add_comment_to_worship_form_songs.sql
│       │   │   └── 006_add_role_permissions.sql  ← 신규
│       │   └── seeds/
│       │       └── 001_initial_data.sql
│       ├── lib/
│       │   └── liturgicalCalendar.js  # 절기 자동 계산 (Easter 알고리즘)
│       ├── middleware/
│       │   ├── authMiddleware.js     # JWT 인증, 관리자 권한 검사
│       │   └── errorHandler.js      # 에러 핸들러, asyncHandler 래퍼
│       └── routes/
│           ├── auth.js              # 로그인, /me, 테마 변경
│           ├── users.js             # 회원 CRUD (관리자 전용)
│           ├── members.js           # 활성 회원 목록 (인도자 선택용)
│           ├── rolePermissions.js   # 역할별 메뉴 권한 CRUD ← 신규
│           ├── worshipForms.js      # 예배 송폼 CRUD
│           ├── songs.js             # 노래 검색/관리
│           ├── sheetMusic.js        # 악보 검색 · 저장 · 이미지 업로드
│           ├── export.js            # PPT 내보내기
│           ├── settings.js          # 앱 설정
│           ├── denominations.js     # 교단 관리
│           ├── worshipCategories.js # 예배 카테고리
│           ├── songFormElements.js  # 송폼 요소
│           └── liturgicalSeasons.js # 절기 조회
│
├── client/                          # Vite React 앱 (포트 5173)
│   └── src/
│       ├── App.jsx                  # 라우팅 설정, ProtectedLayout, AdminRoute
│       ├── main.jsx                 # 앱 진입점
│       ├── index.css                # 전역 CSS, 라이트/다크 모드 정의
│       ├── api/
│       │   └── client.js            # axios 인스턴스, JWT 인터셉터
│       ├── store/
│       │   ├── authStore.js         # 로그인·로그아웃·테마·권한 로드 (Zustand)
│       │   └── settingsStore.js     # 앱 설정 전역 상태 (Zustand)
│       ├── hooks/
│       │   └── usePermission.js     # 메뉴별 권한 조회 훅 ← 신규
│       ├── lib/
│       │   ├── keyUtils.js          # 키(Key) 파싱·빌드·전조 유틸
│       │   └── menuConfig.js        # 메뉴 정의, 역할 목록, 권한 컬럼 상수 ← 신규
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.jsx     # 사이드바 + 메인 레이아웃
│       │   │   └── Sidebar.jsx      # LNB (권한 기반 동적 메뉴)
│       │   └── worshipForm/
│       │       ├── SongCard.jsx     # 찬양 카드 (드래그, 키선택, 악보)
│       │       ├── KeySelector.jsx  # 키 이름 + 변화표 독립 라디오 UI
│       │       ├── FormFlowBuilder.jsx # 송폼 흐름 빌더
│       │       └── SheetMusicModal.jsx # 악보 검색 모달 (Portal 렌더)
│       └── pages/
│           ├── LoginPage.jsx
│           ├── WorshipFormListPage.jsx  # 송폼 목록 (권한 기반 버튼 표시)
│           ├── WorshipFormPage.jsx      # 송폼 생성/편집
│           ├── UserManagementPage.jsx   # 회원 관리
│           ├── RolePermissionsPage.jsx  # 회원 권한 관리 ← 신규
│           └── SettingsPage.jsx         # 환경설정
│
└── uploads/                         # 서버에 저장되는 악보 이미지
```

---

## 4. DB 스키마

### 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `denominations` | 교단 (기본값 1개) |
| `worship_categories` | 예배 카테고리 (주일예배, 수요예배 등) |
| `song_form_elements` | 송폼 요소 (인트로, 절, 후렴 등) |
| `songs` | 노래 마스터 (제목, 아티스트, 기본키, 악보URL) |
| `worship_forms` | 예배 송폼 헤더 (날짜, 카테고리, 절기 등) |
| `worship_form_songs` | 예배별 찬양 목록 (키, 송폼 흐름, 악보 등) |
| `app_settings` | 앱 설정 (JSONB key-value) |
| `users` | 사용자 계정 (역할: admin/leader/user/coworker) |
| `role_permissions` | 역할별 메뉴 권한 ← 신규 |

### role_permissions 테이블

```sql
CREATE TABLE role_permissions (
  id         SERIAL PRIMARY KEY,
  role       VARCHAR(20) NOT NULL,    -- 'leader' | 'user' | 'coworker'
  menu_key   VARCHAR(50) NOT NULL,    -- 'forms_list' | 'forms_create' | 'settings'
  can_read   BOOLEAN NOT NULL DEFAULT false,   -- LNB 메뉴 표시
  can_create BOOLEAN NOT NULL DEFAULT false,   -- 등록 버튼 표시
  can_edit   BOOLEAN NOT NULL DEFAULT false,   -- 수정 버튼 표시
  can_delete BOOLEAN NOT NULL DEFAULT false,   -- 삭제 버튼 표시
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, menu_key)
);
```

### 사용자 역할 (role)

| 값 | 이름 | 설명 |
|----|------|------|
| `admin` | 관리자 | 모든 기능 접근, 권한 관리 |
| `leader` | 리더 | 기본: 송폼 전체 권한 |
| `user` | 단원 | 기본: 송폼 읽기 |
| `coworker` | 동역 | 기본: 송폼 읽기 |

---

## 5. API 목록

### 인증 (`/api/auth`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/auth/login` | 로그인 → JWT 반환 | 공개 |
| GET | `/api/auth/me` | 현재 유저 정보 | 로그인 |
| PATCH | `/api/auth/theme` | 테마 저장 | 로그인 |

### 회원 (`/api/users`, `/api/members`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/users` | 전체 회원 목록 | admin |
| POST | `/api/users` | 회원 등록 | admin |
| PUT | `/api/users/:id` | 회원 수정 | admin |
| DELETE | `/api/users/:id` | 회원 삭제 | admin |
| GET | `/api/members` | 활성 회원 목록 (인도자용) | 로그인 |

### 역할 권한 (`/api/role-permissions`) ← 신규

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/role-permissions/my` | 내 역할 권한 조회 | 로그인 |
| GET | `/api/role-permissions` | 전체 권한 목록 | admin |
| PUT | `/api/role-permissions` | 권한 일괄 저장 (upsert) | admin |

### 예배 송폼 (`/api/worship-forms`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/worship-forms` | 송폼 목록 (필터: year, month, category_id) | 로그인 |
| POST | `/api/worship-forms` | 송폼 생성 | 로그인 |
| GET | `/api/worship-forms/:id` | 송폼 상세 | 로그인 |
| PUT | `/api/worship-forms/:id` | 송폼 수정 | 로그인 |
| DELETE | `/api/worship-forms/:id` | 송폼 삭제 | 로그인 |

### 악보 (`/api/sheet-music`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/sheet-music/search?q=` | DB 악보 검색 | 로그인 |
| GET | `/api/sheet-music/image-search?q=&offset=` | 네이버 이미지 검색 | 로그인 |
| POST | `/api/sheet-music/save-image` | 이미지 서버 저장 (base64/URL) | 로그인 |

### 기타

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/export/pptx/:formId` | PPT 바이너리 반환 | 로그인 |
| GET | `/api/liturgical-seasons/current` | 절기 자동 계산 | 로그인 |
| GET/PUT | `/api/settings/:key` | 앱 설정 조회/수정 | 로그인 |
| GET | `/api/songs?q=&limit=` | 노래 검색 (자동완성용) | 로그인 |

---

## 6. 주요 기능

### 6-1. 예배 송폼 관리

- 날짜, 예배 카테고리, 절기(자동), 인도자, 메모 입력
- 찬양 카드 드래그&드롭으로 순서 변경 (@dnd-kit)
- 각 찬양별 키(Key), 송폼 흐름, 악보, 코멘트 입력
- 저장 후 PPT 내보내기

### 6-2. 키(Key) 선택기

두 그룹이 완전히 독립적인 라디오 버튼으로 동작합니다.

```
키 이름:  [C] [D] [E] [F] [G] [A] [B]    변화표: [♭] [♮] [♯]
```

- **키 이름** (C~B): 클릭 시 해당 음만 변경, 변화표 영향 없음
- **변화표** (♭ ♮ ♯): 클릭 시 변화표만 변경, 키 이름 영향 없음
- 저장 형식: `'C'`, `'Db'`, `'D#'`, `'Bb'` 등 직관적인 문자열

### 6-3. 악보 검색 (SheetMusicModal)

탭 3개로 구성됩니다.

| 탭 | 기능 |
|----|------|
| **Naver 이미지** | `{제목} 악보` 키워드로 네이버 이미지 검색, 5건씩 추가 로드 |
| **저장된 악보** | DB에 저장된 악보 검색 |
| **직접 올리기** | 클릭 또는 드래그&드롭으로 이미지 파일 업로드, 미리보기 후 저장 |

> 모달은 `createPortal`로 `document.body`에 렌더되어 다른 카드 z-index에 영향받지 않습니다.

### 6-4. PPT 내보내기

- `/api/export/pptx/:formId` 호출 → `.pptx` 바이너리 다운로드
- 각 슬라이드: 찬양 제목, 키, 송폼 흐름, 코멘트, 악보 이미지 포함

---

## 7. 권한 관리 시스템

### 7-1. 구조

```
로그인
  └─ authStore.loadMyPermissions()
       └─ GET /api/role-permissions/my
            └─ myPermissions 배열 → Zustand 저장

Sidebar
  └─ myPermissions 필터링 (can_read === true 인 메뉴만 표시)

페이지
  └─ usePermission('forms_list') 훅
       └─ { can_read, can_create, can_edit, can_delete } 반환
```

### 7-2. 설정 가능한 메뉴

| menu_key | 메뉴명 | 경로 |
|----------|--------|------|
| `forms_list` | 송폼 목록 | `/` |
| `forms_create` | 새 송폼 만들기 | `/forms/new` |
| `settings` | 환경설정 | `/settings` |

### 7-3. 권한 컬럼 역할

| 컬럼 | 역할 |
|------|------|
| `can_read` | LNB 메뉴 표시 여부 |
| `can_create` | 등록 버튼 표시 여부 |
| `can_edit` | 수정 버튼 표시 여부 |
| `can_delete` | 삭제 버튼 표시 여부 |

### 7-4. 기본 권한값

| 역할 | forms_list | forms_create | settings |
|------|-----------|--------------|---------|
| 리더 | 읽/쓰/수/삭 | 읽기 | 읽기 |
| 단원 | 읽기만 | — | — |
| 동역 | 읽기만 | — | — |

### 7-5. usePermission 훅

```js
import { usePermission } from '../hooks/usePermission'

const perm = usePermission('forms_list')
// → { can_read: true, can_create: false, can_edit: false, can_delete: false }

// 관리자는 항상 모든 권한 true 반환
```

---

## 8. 실행 방법

### 초기 설정

```bash
# 1. PostgreSQL DB 생성
createdb songform

# 2. 환경변수 설정
# server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/songform
PORT=3001
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_secret_key

# 3. 패키지 설치 및 DB 초기화
cd server
npm install
npm run migrate   # 마이그레이션 실행
npm run seed      # 기본 데이터 삽입

# 4. 클라이언트 패키지 설치
cd ../client
npm install
```

### 실행

```bash
# 터미널 1 - 서버
cd server && npm run dev    # nodemon, 포트 3001

# 터미널 2 - 클라이언트
cd client && npm run dev    # Vite, 포트 5173
```

접속: http://localhost:5173

### DB 마이그레이션 추가 방법

```bash
# server/src/db/migrations/ 에 새 SQL 파일 추가
# 파일명 형식: 007_description.sql
npm run migrate
```

---

## 9. 개발 이력

### v1.0 — 기본 기능

- 예배 송폼 생성/편집/삭제
- 찬양 목록 드래그&드롭 정렬
- 키 선택, 송폼 흐름 빌더
- PPT 내보내기
- 절기 자동 계산 (Easter 알고리즘)
- 로그인/JWT 인증
- 다크/라이트 모드

### v1.1 — 악보 검색

- 네이버 이미지 검색으로 악보 연결 (서버 프록시, base64 변환)
- DB 저장된 악보 검색
- 악보 이미지 서버 저장 (`/uploads/`)
- 추가 검색 (offset 기반 페이징)

### v1.2 — 회원 관리

- 회원 CRUD (관리자 전용)
- 역할 구분: admin / leader / user / coworker
- 인도자 선택 기능 (예배별 다중 선택)
- 송폼 코멘트 (PPT 악보 하단 적색 표시)

### v1.3 — 현재 버전

#### 신규 기능
| 기능 | 설명 |
|------|------|
| **악보 직접 올리기** | SheetMusicModal에 파일 업로드 탭 추가 (드래그&드롭 지원) |
| **회원 권한 관리** | 역할별 LNB 메뉴 접근 및 CRUD 권한 설정 페이지 |
| **동적 사이드바** | 권한에 따라 비관리자 메뉴 동적 렌더링 |
| **페이지 권한 적용** | 송폼 목록에서 권한 없으면 버튼 미표시 |

#### 버그 수정
| 문제 | 원인 | 해결 |
|------|------|------|
| 키 선택 두 번째부터 동작 안 함 | `{ ...s, ...updates }` 시 `semitone_adjustment: undefined` 덮어쓰기 → `transposeKey(key, undefined)` = `NaN` | `undefined` 필터링 후 스프레드, `?? 0` 가드 추가 |
| 키/변화표 상호 간섭 | `buildKey`가 반음 인덱스로 변환 → 음이름이 바뀜 | 완전 독립 `useState` + 단순 문자열 빌드(`'Db'`, `'C#'`) |
| 악보 모달이 카드 뒤로 숨음 | SongCard z-index 컨텍스트 내에서 렌더 | `createPortal(…, document.body)` 로 분리 |
| 회원 구분 미표시 | `admin` 외 모두 '일반'으로 하드코딩 | `ROLE_MAP` 상수로 역할별 레이블·색상 매핑 |
| 여러 카드 z-index 충돌 | 정적 stacking으로 아래 카드가 위 카드 위에 렌더 | 카드별 `position: relative` + 역순 z-index 부여 |

---

## 10. 주요 파일별 핵심 로직

### `keyUtils.js`

```js
// key 문자열 → { base, accidental }
parseKey('Db')  // → { base: 'D', accidental: 'b' }
parseKey('C#')  // → { base: 'C', accidental: '#' }
parseKey('G')   // → { base: 'G', accidental: 'n' }

// { base, accidental } → key 문자열
buildKey('D', 'b')  // → 'Db'
buildKey('C', '#')  // → 'C#'
buildKey('G', 'n')  // → 'G'
```

### `authStore.js`

```js
// 로그인 시 자동 실행
const result = await api.get('/role-permissions/my')
set({ myPermissions: result.permissions })

// 사용 예
const myPermissions = useAuthStore(s => s.myPermissions)
```

### `usePermission.js`

```js
// admin → 항상 모두 true
// 비관리자 → DB 권한 기준
const { can_read, can_create, can_edit, can_delete } = usePermission('forms_list')
```
