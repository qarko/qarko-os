# Hermes Adapter Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make QARKO OS use Hermes as a hidden execution engine for setup health, guided auth, tool presets, and real workspace-based runs.

**Architecture:** Add a clear HermesAdapter surface between React and Tauri/Rust. The UI calls intent-based functions such as health check, guided login, tool preset save, and workspace task execution; Rust maps those calls to allowlisted Hermes CLI arguments. `hermes setup` remains an advanced fallback only.

**Tech Stack:** Tauri + React + Zustand + TypeScript + Rust `Command` with explicit argument arrays.

---

### Task 1: Adapter Contract And Tests

**Files:**
- Modify: `tests/betaReadiness.test.ts`
- Modify: `tests/hermesDesktop.test.ts`
- Modify: `tests/hermesProviders.test.ts`

- [ ] Assert that QARKO exposes a HermesAdapter-style API: health check, guided login, auth status, tool preset, workspace one-shot run.
- [ ] Assert that OAuth login uses `hermes login --provider` with `auth status/list` checks, while `hermes setup` remains fallback.
- [ ] Assert that workspace execution passes a QARKO workspace path and limited toolsets.

### Task 2: Rust HermesAdapter Commands

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] Add serializable health/status structures with config path, env path, doctor output, auth output, tools output, and masked command output.
- [ ] Add allowlisted commands:
  - `hermes_health`
  - `login_hermes_provider`
  - `check_hermes_auth_status`
  - `configure_hermes_tool_preset`
  - `run_hermes_oneshot`
- [ ] Use argument arrays only, never shell string interpolation for user-controlled values.
- [ ] For OAuth, start `hermes login --provider <provider>` in a visible browser-friendly process and verify via `auth status`, `auth list`, `doctor`, or `status --all`.
- [ ] For execution, create `QARKO OS/workspaces/<project>/<run>` and instruct Hermes to write all artifacts there.

### Task 3: Frontend Adapter And Store

**Files:**
- Modify: `src/adapters/hermesDesktop.ts`
- Modify: `src/store/useQarkoStore.ts`
- Modify: `src/types/qarko.ts`

- [ ] Add types for health, tool presets, workspace execution metadata, and auth status.
- [ ] Add store actions for health refresh, guided login, auth status check, tool preset save, and workspace-backed run.
- [ ] Keep secrets out of persisted state and mask command output before showing it.

### Task 4: UI Update

**Files:**
- Modify: `src/components/onboarding/HermesOnboarding.tsx`
- Modify: `src/components/dashboard/WorkspaceDashboard.tsx`
- Modify: `src/components/execution/ExecutionPanel.tsx`

- [ ] Rename setup messaging to “Hermes 작업실 준비”.
- [ ] Add health checklist: core, config, env, auth/model, tools, doctor.
- [ ] Show tool presets as business capabilities, not raw Hermes names.
- [ ] Make OAuth guided flow: start login, check status, show fallback only if needed.
- [ ] Show workspace output path and artifacts in the right panel.

### Task 5: Verification And Review

**Commands:**
- `cmd.exe /d /c npm.cmd test`
- `cmd.exe /d /c npm.cmd run build`
- `cmd.exe /d /c cargo.exe check`
- Browser verification on the local dev server

- [ ] Ask separate UX and security reviewers to inspect changes.
- [ ] Rebuild installer only after review passes.
