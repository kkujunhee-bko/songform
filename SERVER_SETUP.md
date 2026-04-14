# 서버 초기 세팅 가이드 (Ubuntu)

GitHub Actions로 수동 배포하기 전에 서버에서 **최초 1회** 수행하는 작업입니다.

---

## 1. 필수 소프트웨어 설치

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Git
sudo apt-get install -y git
```

---

## 2. PostgreSQL 설정

```bash
sudo -u postgres psql

-- psql 내부
CREATE USER songform_user WITH PASSWORD 'your_password';
CREATE DATABASE songform OWNER songform_user;
\q
```

---

## 3. 프로젝트 클론 (최초 1회)

```bash
cd /srv   # 또는 원하는 경로
git clone https://github.com/kkujunhee-bko/songform.git
cd songform
```

---

## 4. 환경 변수 설정

```bash
cp server/.env.example server/.env
nano server/.env
```

`server/.env` 내용 예시:
```
DATABASE_URL=postgresql://songform_user:your_password@localhost:5432/songform
PORT=3001
CORS_ORIGIN=http://your-domain.com    # 또는 https://
NODE_ENV=production
JWT_SECRET=복잡한_랜덤_문자열_여기_입력
```

---

## 5. 의존성 설치 & DB 초기화

```bash
npm install --workspace=server --omit=dev
npm install --workspace=client
npm run build --workspace=client
npm run db:migrate
npm run db:seed    # 초기 데이터 (관리자 계정 등)
```

---

## 6. PM2로 서버 시작

```bash
# 프로젝트 루트에서 실행
pm2 start ecosystem.config.js
pm2 save                      # 재부팅 후에도 자동 시작 등록
pm2 startup                   # 출력된 명령어를 복사해서 실행
```

확인:
```bash
pm2 list
pm2 logs songform-server
```

---

## 7. GitHub Actions Secrets 등록

GitHub 저장소 → Settings → Secrets and variables → Actions → **New repository secret**

| Secret 이름 | 값 |
|---|---|
| `SERVER_HOST` | 서버 IP 또는 도메인 |
| `SERVER_USER` | SSH 로그인 계정 (예: ubuntu) |
| `SSH_PRIVATE_KEY` | SSH 개인키 내용 (아래 참고) |
| `SERVER_PORT` | SSH 포트 (기본값 22, 생략 가능) |
| `SERVER_PATH` | 서버의 프로젝트 경로 (예: /srv/songform) |

### SSH 키 생성 (로컬 PC에서)
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/songform_deploy
```
- `~/.ssh/songform_deploy.pub` 내용 → **서버의** `~/.ssh/authorized_keys`에 추가
- `~/.ssh/songform_deploy` 내용 → GitHub Secret `SSH_PRIVATE_KEY`에 붙여넣기

---

## 8. 배포 실행 방법

GitHub 저장소 → **Actions** 탭 → **Deploy to Server** → **Run workflow** 버튼 클릭

배포 단계:
1. 저장소 최신화 (`git pull`)
2. 의존성 설치
3. 클라이언트 빌드
4. DB 마이그레이션 (신규분만 적용)
5. PM2 재시작

---

## 로그 확인

```bash
pm2 logs songform-server           # 실시간 로그
pm2 logs songform-server --lines 100   # 최근 100줄
```
