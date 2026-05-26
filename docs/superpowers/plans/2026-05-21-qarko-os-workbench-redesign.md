# QARKO OS Workbench Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn QARKO OS from a Hermes setup shell into a Korean workbench where beta testers can install/connect Hermes, choose a model, run real business tasks, review logs/results, and understand 샌드박스(안전 승인 모드).

**Architecture:** Keep the current Tauri + React + Zustand structure. Add focused UI/data modules for workbench navigation, permission mode copy, and first-run readiness while reusing existing Hermes commands and store actions. Treat Hermes as the execution engine and QARKO as the safe product UX layer.

**Tech Stack:** React 19, TypeScript, Tailwind, Zustand, Tauri Rust commands, Node tests.

---

## File Structure

- Modify `src/types/qarko.ts`: add sandbox mode labels/descriptions if missing.
- Modify `src/data/mockData.ts`: replace generic/sample-heavy copy with beta workbench defaults.
- Modify `src/components/onboarding/HermesOnboarding.tsx`: convert English wizard into Korean readiness checklist.
- Modify `src/components/dashboard/WorkspaceDashboard.tsx`: make the first screen a workbench, not a dashboard of cards.
- Modify `src/components/execution/ExecutionPanel.tsx`: make the right panel a compact live panel with tabs for log, result, approval, feedback.
- Modify `src/components/layout/Sidebar.tsx`: align navigation labels and Hermes status with workbench direction.
- Modify `src/store/useQarkoStore.ts`: add sandbox mode action text and ensure run flow updates logs/results clearly.
- Modify `tests/betaReadiness.test.ts`: add source-level assertions for Korean readiness checklist, 샌드박스(안전 승인 모드), and workbench-first UI.

---

### Task 1: Korean Readiness Checklist

**Files:**
- Modify: `src/components/onboarding/HermesOnboarding.tsx`
- Modify: `tests/betaReadiness.test.ts`

- [ ] Step 1: Add failing assertions that onboarding includes Korean setup language and no English step labels.

```ts
const onboardingSource = readFileSync("src/components/onboarding/HermesOnboarding.tsx", "utf8");
assert.match(onboardingSource, /준비 체크리스트/);
assert.match(onboardingSource, /Hermes 설치/);
assert.match(onboardingSource, /모델 제공자/);
assert.match(onboardingSource, /인증 터미널/);
assert.doesNotMatch(onboardingSource, /Hermes setup wizard/);
assert.doesNotMatch(onboardingSource, /Open auth terminal/);
```

- [ ] Step 2: Run `cmd.exe /d /c npm.cmd test`; expect the new assertions to fail before implementation.

- [ ] Step 3: Rewrite onboarding labels and helper copy in Korean. Keep the existing actions:
  - `installHermesDesktop`
  - `openHermesSetupWizard`
  - `loginHermesOAuthProvider`
  - `saveHermesGuidedSetup`
  - `testHermesRuntime`

- [ ] Step 4: Keep native Hermes terminal opening only as an explicit fallback button, with copy explaining “Hermes가 대화형 설정을 요구할 때만 이 창을 엽니다.”

- [ ] Step 5: Run `cmd.exe /d /c npm.cmd test`; expect pass.

---

### Task 2: 샌드박스(안전 승인 모드) UI

**Files:**
- Modify: `src/types/qarko.ts`
- Modify: `src/data/mockData.ts`
- Modify: `src/store/useQarkoStore.ts`
- Modify: `tests/betaReadiness.test.ts`

- [ ] Step 1: Add failing assertions for the Korean sandbox phrase.

```ts
const storeSource = readFileSync("src/store/useQarkoStore.ts", "utf8");
const typeSource = readFileSync("src/types/qarko.ts", "utf8");
assert.match(typeSource + storeSource, /샌드박스\\(안전 승인 모드\\)/);
assert.match(typeSource + storeSource, /AI가.*컴퓨터 전체를 마음대로/);
```

- [ ] Step 2: Add three user-facing permission modes:
  - `draft`: 보기/초안 모드
  - `assisted`: 샌드박스(안전 승인 모드)
  - `autopilot`: 자동 실행 모드

- [ ] Step 3: Use `assisted` as the default and surface it in action notices and workbench controls.

- [ ] Step 4: Run `cmd.exe /d /c npm.cmd test`; expect pass.

---

### Task 3: Workbench-First Main Screen

**Files:**
- Modify: `src/components/dashboard/WorkspaceDashboard.tsx`
- Modify: `src/components/projects/NewProjectPanel.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `tests/betaReadiness.test.ts`

- [ ] Step 1: Add failing assertions that the app contains “작업실”, “오늘 할 작업”, and “Hermes 실행”.

```ts
const dashboardSource = readFileSync("src/components/dashboard/WorkspaceDashboard.tsx", "utf8");
assert.match(dashboardSource, /작업실/);
assert.match(dashboardSource, /오늘 할 작업/);
assert.match(dashboardSource, /Hermes 실행/);
```

- [ ] Step 2: Change the first-view dashboard into a central workbench:
  - current project
  - business task prompt
  - model and sandbox mode summary
  - run button
  - next steps / approval queue

- [ ] Step 3: Keep project creation accessible, but not as the dominant first screen after Hermes is ready.

- [ ] Step 4: Run `cmd.exe /d /c npm.cmd test` and `cmd.exe /d /c npm.cmd run build`; expect pass.

---

### Task 4: Compact Right Live Panel

**Files:**
- Modify: `src/components/execution/ExecutionPanel.tsx`
- Modify: `src/store/useQarkoStore.ts`
- Modify: `tests/betaReadiness.test.ts`

- [ ] Step 1: Add assertions for right-panel tab labels.

```ts
const executionPanel = readFileSync("src/components/execution/ExecutionPanel.tsx", "utf8");
assert.match(executionPanel, /실행 로그/);
assert.match(executionPanel, /산출물/);
assert.match(executionPanel, /승인/);
assert.match(executionPanel, /피드백/);
```

- [ ] Step 2: Replace large static execution blocks with a compact panel:
  - Hermes status
  - active run status
  - tabs/buttons for log, result, approval, feedback
  - feedback CTA that points users to the feedback flow

- [ ] Step 3: Ensure results from `runNextStep` remain visible after completion.

- [ ] Step 4: Run `cmd.exe /d /c npm.cmd test` and `cmd.exe /d /c npm.cmd run build`; expect pass.

---

### Task 5: Final Verification, Review, Installer

**Files:**
- No new files expected.

- [ ] Step 1: Run full verification:

```powershell
cmd.exe /d /c npm.cmd test
cmd.exe /d /c npm.cmd run build
cmd.exe /d /c cargo.exe check
```

- [ ] Step 2: Spawn separate review agents:
  - UX/code review: verify Korean workbench flow matches the spec.
  - Security review: verify sandbox messaging does not imply stronger isolation than currently implemented and Hermes execution gates remain intact.

- [ ] Step 3: Build the installer:

```powershell
cmd.exe /d /c npm.cmd run desktop:installer
```

- [ ] Step 4: Copy the installer to:

```text
C:\Users\Administrator\OneDrive\바탕 화면\QARKO OS Installer\QARKO OS_0.1.0_x64-setup.exe
```

- [ ] Step 5: Commit and push.

```powershell
git add src tests docs
git commit -m "feat: redesign QARKO workbench flow"
git push origin master
```

---

## Self-Review

- Spec coverage: Covers workbench-first UI, Korean readiness checklist, sandbox explanation, Hermes execution flow, right panel, beta readiness.
- Placeholder scan: No TBD/TODO placeholders.
- Type consistency: Uses existing `AutomationMode` semantics where possible; adds only labels/copy unless a stricter enum is already required by implementation.
