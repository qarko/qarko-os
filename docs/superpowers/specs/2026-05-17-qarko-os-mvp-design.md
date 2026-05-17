# QARKO OS MVP Design

## Purpose

QARKO OS is a real-time operating system for a one-person AI company.

The product helps a non-developer founder turn any business idea into an operating workspace with projects, goals, workflows, AI roles, logs, approvals, artifacts, plugins, and automation controls.

QARKO OS should not be limited to a specific business category. Projects such as AI influencers, YouTube Shorts, SEO blogs, affiliate marketing, SaaS ideas, local business agencies, or any other user idea should all fit into the same operating model.

The first commercial target is a Windows desktop app, but the MVP will be built as a web app first so the core product experience can be tested quickly. The web app should be structured so it can later be wrapped as a Windows desktop app with Tauri.

## Product Positioning

QARKO OS combines three product ideas:

- A one-person business dashboard
- A Codex-like real-time execution interface
- A Hermes-powered agent and model workspace

The main product surface is the business dashboard. Codex-like execution and AI agent roles are embedded inside the dashboard rather than becoming the whole product.

The intended user experience is:

1. The user opens QARKO OS and sees the current state of their one-person business.
2. The user creates or selects a business project.
3. QARKO OS helps turn the idea into goals, stages, tasks, agents, approval gates, and artifacts.
4. AI agents execute safe work within the automation scope chosen by the user.
5. Risky or user-defined actions require explicit approval.
6. Logs and artifacts make the work visible.
7. Workflows and plugins can later be shared through a community model.

## MVP Goals

The MVP should prove that QARKO OS feels like an operating system for a one-person AI company, not a chatbot.

The MVP must include:

- Workspace dashboard
- Project list and active project view
- New project creation flow
- User-controlled automation and approval scope at project start
- AI role cards
- Workflow and task cards
- Codex-like real-time execution panel
- Logs timeline
- Approval queue
- Artifact library
- Plugin gallery inspired by the Codex Windows app plugin experience
- Mock Hermes/model connection state
- Adapter-based structure for future Hermes, plugin, and desktop integrations

The MVP should not include:

- Full plugin runtime
- Real community marketplace
- Payments or subscriptions
- Real publishing automation
- Multi-user collaboration
- Deep Hermes execution integration
- Production authentication

Those features should have visible product slots or data structures where useful, but they should not be fully implemented in the MVP.

## First Screen

The default home screen is the workspace dashboard.

Returning users see:

- Current projects
- Daily priorities
- Running AI work
- Approval requests
- Recent artifacts
- Active plugins
- Hermes/model status

New users or empty workspaces are guided into the new project flow.

This keeps QARKO OS feeling like an operating console while still making onboarding simple.

## Layout

The MVP uses a three-region desktop-style layout inspired by the Codex Windows app.

### Left Sidebar

The sidebar contains:

- Workspace switcher
- Project list
- New project button
- Templates
- Plugins
- Community
- Settings

The sidebar should feel like a persistent operating surface, not a marketing navigation menu.

### Center Dashboard

The center region shows the active project or workspace dashboard.

For the workspace dashboard, it shows:

- Business overview
- Project status cards
- Daily priorities
- Approval queue preview
- Running work preview
- Artifact preview

For an active project, it shows:

- Project goal
- Automation scope
- Workflow stages
- Task cards
- Assigned AI roles
- Key risks
- Next recommended action

### Right Execution Panel

The right panel shows Codex-like live work.

It contains:

- Current run title
- Active agent role
- Selected model or mock model
- Step-by-step activity
- Streaming-style logs
- Pending approval request
- Generated output preview
- Next action buttons

This panel is the main bridge between business dashboard and AI execution.

## Project Creation Flow

When a user creates a project, QARKO OS asks for a business idea or goal in plain language.

Example:

> I want to start a local restaurant short-form marketing agency.

QARKO OS then creates a structured project draft:

- Project name
- Business goal
- Suggested stages
- First tasks
- Suggested AI roles
- Risks
- Recommended plugins
- Initial artifact slots

The project creation flow must also include automation and approval scope selection.

## Automation And Approval Scope

At project start, the user chooses how much QARKO OS can automate.

The MVP provides four modes:

### Manual Mode

AI can research, suggest, and draft, but every meaningful action requires approval.

Best for new users, sensitive projects, and unfamiliar tools.

### Assisted Mode

AI can automatically perform safe internal work such as research summaries, outlines, checklists, drafts, and task organization.

External actions, paid tools, publishing, deletion, and plugin installation still require approval.

This is the recommended default.

### Automation Mode

AI can execute approved workflow steps automatically when they are internal and low risk.

High-risk actions still require approval.

### Custom Mode

The user can configure approval rules by action type.

Action types include:

- Research
- Drafting
- File creation
- Image or video generation
- External posting
- Paid API use
- Plugin install
- Data deletion
- Production settings
- Community sharing

Approval cards always show:

- Action
- What will happen
- Expected result
- Risk
- Options: Approve, Revise, Cancel

## AI Roles

The MVP uses role cards rather than fully autonomous agents.

Initial roles:

- Chief of Staff: turns vague goals into priorities, milestones, and next actions
- Product Manager: defines project requirements and user flows
- Researcher: finds tools, competitors, references, and facts
- Engineer: plans and implements technical work
- Designer: improves UX, layout, and visual clarity
- Growth Marketer: plans content, SEO, distribution, and monetization
- QA / Reviewer: checks quality, risks, missing states, and approval violations
- Operator / Publisher: prepares execution and publishing after approval

Each task can show:

- Assigned role
- Status
- Current step
- Output
- Approval requirement

## Plugins And Community

Plugins should be modeled after the Codex Windows app plugin experience.

The MVP includes a plugin gallery UI with:

- Installed tab
- Recommended tab
- Community tab
- Plugin cards
- Capability summary
- Required permissions
- Related workflows
- Connect or configure action
- Project compatibility hints

Initial sample plugins:

- Hermes Agent Pack
- Browser Research Agent
- Blog SEO Assistant
- Shorts Workflow Kit
- Social Publisher
- Notion Sync
- Google Drive Artifacts
- Local File Operator

In the MVP, plugin actions are mostly mock or local state changes. The purpose is to validate the product model and UI.

Future plugin/community direction:

- Users save workflows as reusable templates.
- Users share templates and plugins with the community.
- Users install community workflows into projects.
- Plugin cards show permissions and risks before activation.
- Hermes agent/model combinations can be shared as presets.

## Hermes Integration

Hermes is treated as a future execution provider for agents and model selection.

The MVP should not depend on deep Hermes integration. Instead, it should include adapter boundaries:

- `AgentRuntimeAdapter`
- `MockAgentRuntimeAdapter`
- `HermesAgentRuntimeAdapter`
- `ModelProviderAdapter`
- `PluginAdapter`
- `DesktopAdapter`

The UI should show Hermes/model status in a way that feels real:

- Connected
- Not connected
- Mock mode
- Model selected
- Agent pack available

The first implementation can use mock data while keeping the naming and interfaces ready for Hermes.

## Data Model

The MVP data model includes:

- Workspace
- Project
- Goal
- Workflow
- Task
- AgentRole
- Run
- LogEntry
- Approval
- Artifact
- Plugin
- AutomationPolicy

Important statuses:

- idle
- planned
- running
- blocked
- needs_approval
- completed
- failed

Important approval risk levels:

- low
- medium
- high
- critical

## Recommended MVP Technology

The user is a non-developer founder, so the initial technology should favor speed, readability, and easy iteration.

Recommended stack:

- Vite
- React
- TypeScript
- Tailwind CSS
- lucide-react
- Zustand
- Mock data stored in TypeScript files

Future stack:

- Tauri for Windows desktop app packaging
- SQLite for local desktop storage
- Supabase or Postgres if cloud accounts and sync become necessary
- Hermes adapters for real agent/model execution

Next.js is not recommended for the first MVP because the current priority is frontend product validation, not server rendering, authentication, or production backend features.

## UX Principles

QARKO OS should feel:

- Operational
- Calm
- Clear
- Founder-friendly
- Powerful without being technical
- Dashboard-first, not chat-first
- Transparent about what AI is doing
- Safe around approvals and risky actions

Avoid:

- A simple chat-only UI
- Marketing-style landing page as the first screen
- Overly decorative cards
- Hiding AI work in vague loading states
- Making automation feel uncontrolled
- Locking the product to one business category

## MVP Success Criteria

The MVP is successful if a user can:

- Open QARKO OS and understand it is a one-person business operating dashboard.
- Create a project from any business idea.
- Choose the automation and approval scope for that project.
- See AI role cards and task cards for the project.
- Watch a Codex-like execution panel show progress and logs.
- Review approval requests before risky actions.
- See artifacts generated by the workflow.
- Open a plugin gallery that feels compatible with future Codex-style plugins.
- Understand how Hermes agents and models will fit, even if the MVP uses mock execution.

The MVP should make the user think:

> This is not a chatbot. This is my AI company control room.

## Implementation Boundary

The first implementation should create a polished frontend MVP with mock data.

It should prioritize:

- Layout
- Navigation
- Dashboard information architecture
- Project creation flow
- Automation policy controls
- Approval cards
- Plugin gallery UX
- Execution panel UX

It should postpone:

- Real authentication
- Real database
- Real Hermes API calls
- Real plugin installation
- Real publishing
- Billing
- Community backend

## Open Decisions

The following decisions can be made during implementation planning:

- Exact file structure
- Whether to start from Vite scaffolding or an existing app if one exists
- Exact visual theme
- Whether mock data is stored as plain TypeScript objects or a small local store
- First set of sample projects and workflows

These are not blocking for the MVP design.
