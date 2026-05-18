# QARKO OS Beta Test Playbook

## Goal

Recruit 3 to 5 free testers who are comfortable trying a Windows installer and giving practical feedback. The main success signal is not praise; it is finding where a non-developer gets stuck.

## Tester Profile

- Windows user
- Not required to know coding, PowerShell, or terminal commands
- Interested in AI tools, 1-person business workflows, or business automation
- Willing to install the app, try Hermes setup, and send feedback from inside QARKO OS

## Test Script

1. Install QARKO OS from the installer.
2. Launch QARKO OS.
3. Walk through the Hermes setup wizard.
4. Pick the model/provider closest to your real environment.
5. Try to save the setup and run a connection test.
6. Open Feedback.
7. Write where you got stuck, what disappeared, what wording was unclear, and whether you could continue.
8. Click `작성한 피드백 보내기`.

## Threads Post

QARKO OS 베타 테스터 3~5명을 찾고 있습니다.

QARKO OS는 Hermes Agent를 비개발자도 Windows 앱에서 쉽게 설치/설정하고, 1인 사업 운영에 활용할 수 있게 만드는 실시간 운영체제입니다.

테스트 요청:
1. Windows 설치 파일로 설치
2. 첫 실행 Hermes 설정 마법사 진행
3. 막히는 지점은 앱 안의 피드백 화면에서 저장 후 보내기

개발 지식이 없어도 괜찮습니다. 오히려 초보자 관점의 막힘이 가장 중요합니다.

## Triage Rules

- P0: App closes, installer fails, feedback cannot be sent.
- P1: Hermes install or login cannot finish from the UI.
- P2: User can continue, but wording or next action is unclear.
- P3: Visual polish, layout density, naming, or preference feedback.

## Daily Loop

1. Open QARKO OS Feedback.
2. Click `서버 피드백 불러오기`.
3. Group feedback by P0/P1/P2/P3.
4. Fix P0/P1 first.
5. Rebuild installer.
6. Send updated installer to testers.
