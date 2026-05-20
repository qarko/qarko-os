# QARKO OS Windows 데스크톱 앱

QARKO OS는 Vite/React 앱을 Tauri v2로 감싼 Windows 데스크톱 앱입니다. 목표는 비개발자가 터미널이나 PowerShell을 직접 다루지 않고도 Hermes를 설치, 연결, 실행할 수 있게 만드는 것입니다.

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

## Windows 설치 파일 빌드

```powershell
npm.cmd run desktop:installer
```

빌드가 성공하면 NSIS 설치 파일이 아래 위치에 생성됩니다.

```text
src-tauri\target\release\bundle\nsis\QARKO OS_0.1.0_x64-setup.exe
```

설치 프로그램은 설치 후 Hermes Agent Windows installer를 백그라운드에서 실행할 수 있습니다. QARKO는 Hermes 설치 스크립트 해시와 설치 후 실행 파일 상태를 확인한 뒤, 검증된 Hermes만 작업 실행에 사용합니다.

첫 실행 화면은 “Hermes setup wizard”가 아니라 **준비 체크리스트**입니다. 사용자는 QARKO 안에서 Hermes 설치, 모델 제공자 선택, 인증, 모델 저장, 연결 확인을 진행합니다. Hermes가 대화형 설정을 요구하는 경우에만 QARKO가 별도 인증 터미널을 열어 안내합니다.

## Railway API 배포

Railway에는 React 빌드와 API 서버를 함께 배포합니다.

```powershell
npm.cmd run build
npm.cmd run start
```

Railway 설정:

- Build command: `npm run build`
- Start command: `npm run start`
- Health check: `/api/health`

기본 데이터 파일은 `.data/qarko-workspace.json`입니다. Railway에서 영구 저장이 필요하면 Volume을 만들고 환경 변수로 아래 값을 지정합니다.

```text
QARKO_DATA_FILE=/data/qarko-workspace.json
```

## 현재 핵심 기능

- 작업실 중심 메인 화면
- Hermes 설치/복구/검증
- 모델 제공자와 모델 선택
- OAuth 또는 API 키 기반 연결 확인
- 실제 Hermes 실행을 통한 MVP 작업 초안 생성
- 샌드박스(안전 승인 모드) 권한 설명
- 오른쪽 실시간 패널: 실행 로그, 산출물, 승인, 피드백, Hermes 상태
- 화면 주석과 피드백 저장/전송
- Railway API 기반 피드백 수집과 Discord 알림

## 샌드박스(안전 승인 모드)

샌드박스(안전 승인 모드)는 AI가 어디까지 자동으로 움직일지 사용자가 먼저 정하는 보호 흐름입니다. 베타에서는 위험 작업을 승인 대기 목록으로 보여주고, 검증된 Hermes 실행 파일만 사용하도록 제한합니다. OS 수준 파일 격리와 더 강한 권한 차단은 상용화 전 추가해야 하는 보안 과제입니다.

현재 베타에서는 이 개념을 UI와 승인 흐름으로 먼저 제공하며, 상용화 전에는 OS 수준의 안전 저장소와 더 강한 작업 폴더 격리를 추가해야 합니다.
