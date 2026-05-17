# QARKO OS Windows 데스크톱 앱

QARKO OS는 Vite/React 웹앱을 Tauri v2로 감싼 Windows 데스크톱 앱입니다.

## 개발 실행

```powershell
npm.cmd run desktop:dev
```

개발 중에는 Vite 개발 서버와 Tauri 창이 함께 실행됩니다.

## 릴리스 빌드

```powershell
npm.cmd run desktop:build
```

빌드가 성공하면 Windows 실행 파일이 아래 위치에 생성됩니다.

```text
src-tauri\target\release\qarko-os.exe
```

## Railway 웹/API 배포

Railway에는 같은 React 앱과 API 서버를 함께 배포합니다.

```powershell
npm.cmd run build
npm.cmd run start
```

Railway에서는 `railway.json`의 설정을 사용합니다.

- Build command: `npm run build`
- Start command: `npm run start`
- Health check: `/api/health`

기본 저장 파일은 `.data/qarko-workspace.json`입니다. Railway에서 장기 저장이 필요하면 Volume을 만들고 환경 변수로 아래 값을 지정하세요.

```text
QARKO_DATA_FILE=/data/qarko-workspace.json
```

배포 후 앱 설정 화면의 API 주소에 아래 형식으로 입력하면 웹앱과 Windows 앱이 같은 워크스페이스를 저장/복원할 수 있습니다.

```text
https://YOUR-RAILWAY-APP.up.railway.app/api
```

## 현재 포함된 기능

- QARKO OS 운영 대시보드
- 새 프로젝트 생성과 7일 검증 운영안 자동 구성
- 승인 대기열과 승인 처리 흐름
- 실행 로그와 Hermes mock 런타임 표시
- Hermes/OpenAI-compatible API 주소, API key, 모델명 설정
- Hermes `/v1/models` 연결 테스트와 실행 패널 런타임 상태 반영
- 플러그인 갤러리와 설치/비활성화 mock 흐름
- 브라우저/데스크톱 로컬 저장 기반 상태 유지
- Railway API 기반 워크스페이스 저장/복원
- 샘플 상태 초기화 설정 화면

## Hermes 연결

앱의 `설정 > Hermes 런타임 설정`에서 아래 값을 입력한 뒤 `연결 테스트`를 누르세요.

```text
API 주소: http://localhost:11434/v1
모델: hermes-3
API Key: 로컬 Hermes가 키를 요구하지 않으면 비워둠
```

연결 테스트는 OpenAI-compatible `/models` 엔드포인트를 호출합니다. 연결에 성공하면 우측 실행 패널의 Runtime이 `Hermes 연결됨`으로 바뀌고, 다음 단계 실행 로그가 Hermes 연결 상태를 반영합니다.

## 다음 제품화 단계

- SQLite 기반 로컬 워크스페이스 저장소
- Hermes 에이전트 실행 API와 산출물 저장 연결
- 플러그인 manifest/권한/설치 샌드박스
- NSIS 또는 MSI 설치 파일 패키징
- 앱 자동 업데이트와 오류 리포팅
