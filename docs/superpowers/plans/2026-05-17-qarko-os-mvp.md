# QARKO OS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished web MVP of QARKO OS: a one-person AI company dashboard with project creation, automation/approval controls, Codex-like execution UI, artifacts, and plugin gallery.

**Architecture:** Create a Vite + React + TypeScript frontend with mock data and focused components. Keep the app frontend-only for MVP, but define adapter/type boundaries so Hermes, plugins, local desktop APIs, and future Tauri packaging can be added later without rewriting the UI.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, lucide-react, Zustand, mock TypeScript data.

---

## File Structure

- Create: `package.json` - npm scripts and dependencies.
- Create: `index.html` - Vite app entry.
- Create: `tsconfig.json` - TypeScript config.
- Create: `tsconfig.node.json` - Vite config TypeScript support.
- Create: `vite.config.ts` - Vite React config.
- Create: `tailwind.config.js` - Tailwind content and theme setup.
- Create: `postcss.config.js` - Tailwind PostCSS setup.
- Create: `src/main.tsx` - React root mount.
- Create: `src/App.tsx` - Main app shell and route-like view state.
- Create: `src/index.css` - Global styles and Tailwind layers.
- Create: `src/types/qarko.ts` - Core domain types.
- Create: `src/data/mockData.ts` - Workspace, projects, runs, approvals, artifacts, plugins.
- Create: `src/store/useQarkoStore.ts` - Zustand state and actions.
- Create: `src/adapters/agentRuntime.ts` - Mock/Hermes-ready agent runtime interface.
- Create: `src/components/layout/AppShell.tsx` - Three-region desktop shell.
- Create: `src/components/layout/Sidebar.tsx` - Workspace/project/plugin navigation.
- Create: `src/components/dashboard/WorkspaceDashboard.tsx` - Home dashboard.
- Create: `src/components/projects/ProjectView.tsx` - Active project dashboard.
- Create: `src/components/projects/NewProjectPanel.tsx` - New project creation and automation scope UI.
- Create: `src/components/execution/ExecutionPanel.tsx` - Codex-like right panel.
- Create: `src/components/approvals/ApprovalCard.tsx` - Approval request UI.
- Create: `src/components/artifacts/ArtifactLibrary.tsx` - Artifact preview/list.
- Create: `src/components/plugins/PluginGallery.tsx` - Codex-style plugin gallery.
- Create: `src/components/ui/StatusBadge.tsx` - Shared status badge.
- Create: `src/components/ui/SectionHeader.tsx` - Shared compact section header.

## Task 1: Scaffold The Web App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

- [ ] **Step 1: Create project package files**

Create `package.json`:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc && vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.7",
    "typescript": "^5.7.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "lucide-react": "^0.468.0",
    "zustand": "^5.0.2"
  },
  "devDependencies": {}
}
```

- [ ] **Step 2: Create Vite and TypeScript config**

Create `index.html`:

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

Create `tsconfig.json`, `tsconfig.node.json`, and `vite.config.ts` with standard Vite React TypeScript settings.

- [ ] **Step 3: Create Tailwind setup**

Create `tailwind.config.js` with `./index.html` and `./src/**/*.{ts,tsx}` content paths.

Create `postcss.config.js` with `tailwindcss` and `autoprefixer`.

- [ ] **Step 4: Create minimal React entry**

Create `src/main.tsx`, `src/App.tsx`, and `src/index.css`.

`App.tsx` initially renders the app name and a blank shell placeholder.

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: dependencies install successfully and `package-lock.json` is created.

- [ ] **Step 6: Verify scaffold**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

## Task 2: Define Core Types, Mock Data, And Store

**Files:**
- Create: `src/types/qarko.ts`
- Create: `src/data/mockData.ts`
- Create: `src/store/useQarkoStore.ts`
- Create: `src/adapters/agentRuntime.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Define domain types**

Create types for:

- `Workspace`
- `Project`
- `AutomationPolicy`
- `ApprovalRule`
- `AgentRole`
- `Workflow`
- `QarkoTask`
- `Run`
- `LogEntry`
- `Approval`
- `Artifact`
- `Plugin`

Statuses must include: `idle`, `planned`, `running`, `blocked`, `needs_approval`, `completed`, `failed`.

- [ ] **Step 2: Create mock workspace data**

Create one workspace with three generic projects:

- `AI Business Launchpad`
- `Local Service Growth System`
- `Digital Product Studio`

These are examples only and must not lock QARKO OS to a specific business category.

- [ ] **Step 3: Create automation policy examples**

Create policy data for:

- Manual Mode
- Assisted Mode
- Automation Mode
- Custom Mode

Assisted Mode is the default.

- [ ] **Step 4: Create adapter interface**

Create `AgentRuntimeAdapter` with methods:

```ts
getStatus(): RuntimeStatus;
startRun(projectId: string): Promise<Run>;
requestApproval(approvalId: string, decision: ApprovalDecision): Promise<Approval>;
```

Also export `mockAgentRuntime`.

- [ ] **Step 5: Create Zustand store**

Create state for selected project, selected view, selected automation mode, active run, approvals, artifacts, and plugins.

Actions:

- `selectProject(projectId: string)`
- `setView(view: AppView)`
- `createProject(input: NewProjectInput)`
- `setAutomationMode(mode: AutomationMode)`
- `resolveApproval(approvalId: string, decision: ApprovalDecision)`
- `togglePlugin(pluginId: string)`

- [ ] **Step 6: Verify type safety**

Run: `npm run build`

Expected: no TypeScript errors.

## Task 3: Build The Codex-Like App Shell

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/ui/StatusBadge.tsx`
- Create: `src/components/ui/SectionHeader.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Build shared UI utilities**

Create `StatusBadge` for status and risk labels.

Create `SectionHeader` for compact dashboard section headings.

- [ ] **Step 2: Build left sidebar**

Sidebar includes:

- QARKO OS brand
- Workspace label
- Project list
- New Project
- Templates
- Plugins
- Community
- Settings

- [ ] **Step 3: Build shell layout**

`AppShell` uses a fixed-height, three-region layout:

- Left sidebar: 280px
- Center content: flexible
- Right execution panel: 380px

It must remain usable on desktop widths and collapse the right panel below the main content on narrow screens.

- [ ] **Step 4: Connect shell to store**

`App.tsx` renders `AppShell` and switches center content by selected view.

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: layout components compile without errors.

## Task 4: Build Workspace And Project Dashboards

**Files:**
- Create: `src/components/dashboard/WorkspaceDashboard.tsx`
- Create: `src/components/projects/ProjectView.tsx`
- Create: `src/components/approvals/ApprovalCard.tsx`
- Create: `src/components/artifacts/ArtifactLibrary.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build workspace dashboard**

Show:

- Business overview metrics
- Project status cards
- Daily priorities
- Running AI work
- Approval queue preview
- Recent artifacts
- Active plugins

- [ ] **Step 2: Build active project view**

Show:

- Project goal
- Automation mode summary
- Workflow stages
- Task cards
- AI role cards
- Risk summary
- Next recommended action

- [ ] **Step 3: Build approval card**

Approval card shows:

- Action
- What will happen
- Expected result
- Risk
- Approve / Revise / Cancel buttons

- [ ] **Step 4: Build artifact library**

Artifact library shows generated documents, plans, research notes, and workflow outputs.

- [ ] **Step 5: Verify dashboard behavior**

Run: `npm run build`

Expected: workspace and project views compile and read mock data from the store.

## Task 5: Build Project Creation And Automation Scope Controls

**Files:**
- Create: `src/components/projects/NewProjectPanel.tsx`
- Modify: `src/store/useQarkoStore.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build project idea input**

Create a panel with:

- Business idea textarea
- Suggested project name preview
- Create project button

- [ ] **Step 2: Build automation mode selector**

Show four modes:

- Manual
- Assisted
- Automation
- Custom

Each mode must clearly explain what AI can do and what still requires approval.

- [ ] **Step 3: Build custom approval rules**

When Custom mode is selected, show toggles for:

- Research
- Drafting
- File creation
- Image/video generation
- External posting
- Paid API use
- Plugin install
- Data deletion
- Production settings
- Community sharing

- [ ] **Step 4: Wire project creation**

`createProject` adds a project using the selected automation policy and navigates to that project.

- [ ] **Step 5: Verify creation flow**

Run: `npm run build`

Expected: no TypeScript errors, new project flow compiles.

## Task 6: Build Execution Panel And Plugin Gallery

**Files:**
- Create: `src/components/execution/ExecutionPanel.tsx`
- Create: `src/components/plugins/PluginGallery.tsx`
- Modify: `src/App.tsx`
- Modify: `src/store/useQarkoStore.ts`

- [ ] **Step 1: Build execution panel**

Show:

- Current run title
- Active AI role
- Mock selected model
- Hermes status
- Step-by-step activity
- Streaming-style logs
- Pending approval
- Output preview
- Next action buttons

- [ ] **Step 2: Build plugin gallery**

Plugin gallery includes tabs:

- Installed
- Recommended
- Community

Plugin cards show:

- Name
- Capability
- Required permissions
- Related workflows
- Risk level
- Connect/configure button

- [ ] **Step 3: Wire plugin toggles**

Installed state updates locally in Zustand.

- [ ] **Step 4: Verify plugin and execution views**

Run: `npm run build`

Expected: execution panel and plugin gallery compile.

## Task 7: Polish, Review, And Run The MVP

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.tsx`
- Modify: any component with layout or text issues

- [ ] **Step 1: Polish visual hierarchy**

Ensure the app feels like an operating dashboard:

- Dense but readable layout
- Clear status colors
- No marketing hero page
- No single-color theme
- Buttons use lucide icons where useful
- Text does not overflow controls

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: build passes.

- [ ] **Step 3: Start dev server**

Run: `npm run dev`

Expected: local URL is available.

- [ ] **Step 4: Browser verification**

Open the local URL and verify:

- Workspace dashboard appears
- Sidebar navigation works
- Project view appears
- New project flow works
- Automation modes display
- Execution panel shows logs
- Plugin gallery displays cards
- No obvious overlapping text

- [ ] **Step 5: Reviewer Mode pass**

Review the MVP as an independent QA/code reviewer.

Look for:

- Missing approval states
- Overly chat-like UI
- Broken navigation
- Poor mobile/narrow width behavior
- Plugin permissions not visible
- Hermes status unclear
- TypeScript or build issues

- [ ] **Step 6: Fix blocking review issues**

Fix any issue that prevents the MVP from matching the design.

- [ ] **Step 7: Re-run build**

Run: `npm run build`

Expected: build passes after fixes.

## Self-Review

Spec coverage:

- Business dashboard: covered by Tasks 3 and 4.
- New project flow: covered by Task 5.
- Automation/approval scope: covered by Tasks 2 and 5.
- AI role cards: covered by Tasks 2 and 4.
- Codex-like execution panel: covered by Task 6.
- Approval queue and cards: covered by Task 4.
- Artifact library: covered by Task 4.
- Plugin gallery: covered by Task 6.
- Hermes adapter boundary: covered by Task 2.
- Desktop-ready structure: covered by adapter boundaries and Vite frontend architecture.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified implementation placeholders remain.

Type consistency:

- Status, approval, plugin, project, run, and adapter concepts are defined before component work.
