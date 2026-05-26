# QARKO Runner Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make QARKO OS behave like a Codex-style desktop wrapper for Hermes CLI by stabilizing project sessions, command execution state, project logs, and long-running task status.

**Architecture:** Add a small Runner layer between the Zustand store and the Tauri Hermes adapter. The UI should consume normalized run state instead of raw CLI details, while the Tauri adapter remains responsible for invoking Hermes. SSH is intentionally out of scope, but the Runner interface should allow a future `SshHermesRunner`.

**Tech Stack:** React, Zustand, TypeScript, Tauri, Rust, Hermes CLI, Node test runner, tsx tests.

---

## File Structure

- Modify `src/types/qarko.ts`
  - Add normalized execution event/status types.
  - Extend `Run` with runner target, timing, and active step fields.
- Create `src/adapters/hermesRunner.ts`
  - Own the local Hermes runner request/response mapping.
  - Hide Tauri adapter naming from the store.
  - Preserve future `LocalHermesRunner` / `SshHermesRunner` split.
- Modify `src/store/useQarkoStore.ts`
  - Replace direct `runHermesWorkbenchStep` calls with the Runner.
  - Add helper functions for user log, status log, completion log, and error log.
  - Keep project-level session id and clear it only on validated session errors.
- Modify `src/components/projects/ProjectView.tsx`
  - Show Codex-style central execution state, elapsed time, and current Hermes phase.
- Modify `src/components/execution/ExecutionPanel.tsx`
  - Make the right rail show normalized execution events and active status.
  - Keep it compact by default.
- Modify `tests/betaReadiness.test.ts`
  - Add source-level assertions that the Runner exists, store uses it, and session ids stay project-scoped.
- Create `tests/hermesRunner.test.ts`
  - Unit test runner request mapping, session resume, and safe error mapping.

---

### Task 1: Define Runner State Types

**Files:**
- Modify: `src/types/qarko.ts`
- Test: `tests/betaReadiness.test.ts`

- [ ] **Step 1: Write the failing source assertion**

Add assertions to `tests/betaReadiness.test.ts`:

```ts
test("Runner state is modeled separately from raw Hermes adapter output", () => {
  const types = readFileSync("src/types/qarko.ts", "utf8");

  assert.match(types, /export type RunnerTarget = "local"/);
  assert.match(types, /export type ExecutionPhase =/);
  assert.match(types, /runnerTarget: RunnerTarget/);
  assert.match(types, /startedAt\?: string/);
  assert.match(types, /completedAt\?: string/);
  assert.match(types, /activePhase: ExecutionPhase/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm.cmd test -- tests/betaReadiness.test.ts
```

Expected: fails because `RunnerTarget`, `ExecutionPhase`, and run timing fields do not exist.

- [ ] **Step 3: Add the minimal types**

Modify `src/types/qarko.ts`:

```ts
export type RunnerTarget = "local";
export type ExecutionPhase =
  | "ready"
  | "queued"
  | "starting"
  | "resuming_session"
  | "running"
  | "receiving_output"
  | "waiting_for_approval"
  | "completed"
  | "failed"
  | "cancelled";
```

Extend `Run`:

```ts
  runnerTarget: RunnerTarget;
  activePhase: ExecutionPhase;
  startedAt?: string;
  completedAt?: string;
  elapsedMs?: number;
```

- [ ] **Step 4: Update run constructors**

Modify `emptyRun` and `buildRunForProject` in `src/store/useQarkoStore.ts`:

```ts
  runnerTarget: "local",
  activePhase: "ready",
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
npm.cmd test -- tests/betaReadiness.test.ts
```

Expected: beta readiness tests pass.

---

### Task 2: Add Local Hermes Runner Adapter

**Files:**
- Create: `src/adapters/hermesRunner.ts`
- Modify: `src/store/useQarkoStore.ts`
- Test: `tests/hermesRunner.test.ts`

- [ ] **Step 1: Write the failing runner tests**

Create `tests/hermesRunner.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Hermes runner exposes a local runner boundary", () => {
  const source = readFileSync("src/adapters/hermesRunner.ts", "utf8");

  assert.match(source, /export interface HermesRunnerRequest/);
  assert.match(source, /export interface HermesRunnerResult/);
  assert.match(source, /export const runLocalHermesTurn/);
  assert.match(source, /runHermesWorkbenchStep/);
});

test("store depends on Hermes runner instead of raw workbench adapter", () => {
  const store = readFileSync("src/store/useQarkoStore.ts", "utf8");

  assert.match(store, /runLocalHermesTurn/);
  assert.doesNotMatch(store, /runHermesWorkbenchStep\(/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm.cmd test -- tests/hermesRunner.test.ts
```

Expected: fails because `src/adapters/hermesRunner.ts` does not exist.

- [ ] **Step 3: Create the Runner adapter**

Create `src/adapters/hermesRunner.ts`:

```ts
import { runHermesWorkbenchStep } from "./hermesDesktop";

export interface HermesRunnerRequest {
  prompt: string;
  modelName: string;
  provider: string;
  apiKey: string;
  projectId: string;
  runId: string;
  sessionId?: string;
  toolsets?: string;
}

export interface HermesRunnerResult {
  ok: boolean;
  message: string;
  output: string;
  workspacePath?: string;
  sessionId?: string;
}

export const runLocalHermesTurn = async (request: HermesRunnerRequest): Promise<HermesRunnerResult> => {
  return runHermesWorkbenchStep({
    prompt: request.prompt,
    modelName: request.modelName,
    provider: request.provider,
    apiKey: request.apiKey,
    projectId: request.projectId,
    runId: request.runId,
    sessionId: request.sessionId,
    toolsets: request.toolsets,
  });
};
```

- [ ] **Step 4: Route store through the Runner**

Modify imports in `src/store/useQarkoStore.ts`:

```ts
import { runLocalHermesTurn } from "../adapters/hermesRunner";
```

Remove `runHermesWorkbenchStep` from the `../adapters/hermesDesktop` import list.

Replace:

```ts
const result = await runHermesWorkbenchStep({
```

With:

```ts
const result = await runLocalHermesTurn({
```

- [ ] **Step 5: Run the runner tests**

Run:

```bash
npm.cmd test -- tests/hermesRunner.test.ts
```

Expected: both runner tests pass.

---

### Task 3: Normalize Execution Phases and Timing

**Files:**
- Modify: `src/store/useQarkoStore.ts`
- Test: `tests/betaReadiness.test.ts`

- [ ] **Step 1: Write the failing assertions**

Add to `tests/betaReadiness.test.ts`:

```ts
test("project runs track long-running Hermes status", () => {
  const store = readFileSync("src/store/useQarkoStore.ts", "utf8");

  assert.match(store, /activePhase: "starting"/);
  assert.match(store, /activePhase: result\.ok \? "completed" : "failed"/);
  assert.match(store, /startedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(store, /completedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(store, /elapsedMs:/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm.cmd test -- tests/betaReadiness.test.ts
```

Expected: fails because phases and timing are not fully tracked.

- [ ] **Step 3: Add execution start timing**

In `runNextStep`, before setting the running run:

```ts
const startedAt = new Date().toISOString();
```

In `runningRun`:

```ts
activePhase: projectRun.hermesSessionId ? "resuming_session" : "starting",
startedAt,
completedAt: undefined,
elapsedMs: undefined,
```

- [ ] **Step 4: Add completion timing**

Before building `completedRun`:

```ts
const completedAt = new Date().toISOString();
const elapsedMs = currentRun.startedAt ? Date.now() - new Date(currentRun.startedAt).getTime() : undefined;
```

In `completedRun`:

```ts
activePhase: result.ok ? "completed" : "failed",
completedAt,
elapsedMs,
```

- [ ] **Step 5: Add error timing**

Before building `failedRun`:

```ts
const completedAt = new Date().toISOString();
const elapsedMs = currentRun.startedAt ? Date.now() - new Date(currentRun.startedAt).getTime() : undefined;
```

In `failedRun`:

```ts
activePhase: "failed",
completedAt,
elapsedMs,
```

- [ ] **Step 6: Run the beta tests**

Run:

```bash
npm.cmd test -- tests/betaReadiness.test.ts
```

Expected: tests pass.

---

### Task 4: Separate Chat Messages from Execution Logs

**Files:**
- Modify: `src/types/qarko.ts`
- Modify: `src/store/useQarkoStore.ts`
- Modify: `src/components/projects/ProjectView.tsx`
- Test: `tests/betaReadiness.test.ts`

- [ ] **Step 1: Write the failing source assertions**

Add to `tests/betaReadiness.test.ts`:

```ts
test("runs keep chat messages separate from execution logs", () => {
  const types = readFileSync("src/types/qarko.ts", "utf8");
  const store = readFileSync("src/store/useQarkoStore.ts", "utf8");
  const projectView = readFileSync("src/components/projects/ProjectView.tsx", "utf8");

  assert.match(types, /export interface ChatMessage/);
  assert.match(types, /messages: ChatMessage\[\]/);
  assert.match(store, /appendChatTranscript/);
  assert.match(projectView, /activeRun\.messages/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm.cmd test -- tests/betaReadiness.test.ts
```

Expected: fails because chat messages are not separated yet.

- [ ] **Step 3: Add chat message type**

Modify `src/types/qarko.ts`:

```ts
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  status: Status;
}
```

Extend `Run`:

```ts
  messages: ChatMessage[];
```

- [ ] **Step 4: Initialize messages**

In `emptyRun`:

```ts
messages: [],
```

In `buildRunForProject`:

```ts
messages: [
  {
    id: `message-${project.id}-system`,
    role: "system",
    content: "프로젝트가 생성되었습니다. Hermes에게 작업을 입력하면 이 프로젝트 세션에서 이어서 실행합니다.",
    createdAt: new Date().toISOString(),
    status: "planned",
  },
],
```

- [ ] **Step 5: Add transcript helper**

In `src/store/useQarkoStore.ts`:

```ts
const appendChatTranscript = (run: Run, messages: ChatMessage[]) => {
  const lines = [...run.messages, ...messages].map((message) =>
    `${message.role} [${message.status}]: ${redactSensitiveText(message.content).slice(0, 1600)}`
  );
  const transcript = lines.join("\n\n");
  return transcript.length > 24000 ? transcript.slice(-24000) : transcript;
};
```

Also import `ChatMessage` from `../types/qarko`.

- [ ] **Step 6: Store user and Hermes messages**

When starting a run, create:

```ts
const userMessage: ChatMessage = {
  id: `message-${project.id}-${nextStep}-user`,
  role: "user",
  content: safeUserPrompt,
  createdAt: startedAt,
  status: "completed",
};
```

Add to `runningRun`:

```ts
messages: [...currentRun.messages, userMessage],
sessionTranscript: appendChatTranscript(currentRun, [userMessage]),
```

On completion, create an assistant message and append it to `completedRun.messages`.

- [ ] **Step 7: Render messages in the project view**

Modify `src/components/projects/ProjectView.tsx` to render `activeRun.messages` for the central chat area instead of relying only on `activeRun.logs`.

- [ ] **Step 8: Run tests**

Run:

```bash
npm.cmd test
```

Expected: all tests pass.

---

### Task 5: Improve Codex-Style Status UI

**Files:**
- Modify: `src/components/projects/ProjectView.tsx`
- Modify: `src/components/execution/ExecutionPanel.tsx`
- Test: manual Playwright screenshot

- [ ] **Step 1: Add readable phase labels**

In `ProjectView.tsx` and `ExecutionPanel.tsx`, add local phase label maps:

```ts
const phaseLabel: Record<ExecutionPhase, string> = {
  ready: "준비됨",
  queued: "실행 대기",
  starting: "Hermes 시작 중",
  resuming_session: "이전 세션 이어가는 중",
  running: "실행 중",
  receiving_output: "응답 수신 중",
  waiting_for_approval: "승인 대기",
  completed: "완료",
  failed: "오류",
  cancelled: "취소됨",
};
```

- [ ] **Step 2: Show elapsed time**

Render:

```tsx
{activeRun.elapsedMs ? `${Math.round(activeRun.elapsedMs / 1000)}초` : activeRun.startedAt ? "진행 중" : "대기"}
```

- [ ] **Step 3: Keep right panel compact**

In `ExecutionPanel.tsx`, keep the icon rail visible, and put detailed phase/log content only inside the expanded panel.

- [ ] **Step 4: Manual screenshot verification**

Run:

```bash
npm.cmd run dev -- --host 127.0.0.1
npx playwright screenshot http://127.0.0.1:5174 output/playwright/qarko-runner-core.png
```

Expected: workbench is centered, right rail is compact, and the active phase is visible.

---

### Task 6: Full Verification and Packaging

**Files:**
- No code files unless verification finds a bug.

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm.cmd test
```

Expected: all Node and TypeScript tests pass.

- [ ] **Step 2: Run frontend build**

Run:

```bash
npm.cmd run build
```

Expected: Vite build completes successfully.

- [ ] **Step 3: Run Rust check**

Run:

```bash
cargo check
```

From:

```bash
src-tauri
```

Expected: Rust check completes successfully.

- [ ] **Step 4: Run installer build**

Run:

```bash
npm.cmd run desktop:installer
```

Expected: NSIS installer is generated under `src-tauri/target/release/bundle/nsis`.

- [ ] **Step 5: Commit**

Run:

```bash
git add src tests docs
git commit -m "feat: add Hermes runner core"
git push
```

Expected: branch `codex/qarko-workbench-redesign` is pushed.

---

## Self-Review

- Spec coverage: The plan covers project session continuity, CLI wrapping through a Runner, execution logs, long-running status, Codex-style panel behavior, and excludes SSH from implementation.
- Placeholder scan: The plan does not contain deferred requirement markers or intentionally incomplete implementation steps.
- Type consistency: `RunnerTarget`, `ExecutionPhase`, `ChatMessage`, `Run.messages`, and `runLocalHermesTurn` are named consistently across tasks.
