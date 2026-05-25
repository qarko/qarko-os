import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  checkHermesAuthStatus,
  configureHermesGuidedSetup,
  configureHermesToolPreset,
  getHermesDesktopStatus,
  getHermesHealthReport,
  loginHermesProvider,
  runHermesWorkbenchStep,
} from "../src/adapters/hermesDesktop";
import { isTrustedSyncEndpoint } from "../src/adapters/workspaceSync";
import { redactSensitiveText } from "../src/utils/redaction";

test("beta workspace starts without seeded sample projects", () => {
  const storeSource = readFileSync("src/store/useQarkoStore.ts", "utf8");

  assert.match(storeSource, /projects:\s*\[\]/);
  assert.match(storeSource, /selectedProjectId:\s*""/);
  assert.match(storeSource, /view:\s*"workspace"/);
  assert.match(storeSource, /showHermesOnboarding:\s*false/);
  assert.match(storeSource, /merge:[\s\S]*showHermesOnboarding:\s*false/);
  assert.match(storeSource, /approvals:\s*\[\]/);
  assert.match(storeSource, /artifacts:\s*\[\]/);
  assert.match(storeSource, /qarko-os-workspace-v4/);
});

test("next-step execution is wired to real Hermes one-shot generation", () => {
  const desktopAdapter = readFileSync("src/adapters/hermesDesktop.ts", "utf8");
  const rustSource = readFileSync("src-tauri/src/lib.rs", "utf8");
  const storeSource = readFileSync("src/store/useQarkoStore.ts", "utf8");
  const typeSource = readFileSync("src/types/qarko.ts", "utf8");
  const redactionSource = readFileSync("src/utils/redaction.ts", "utf8");

  assert.match(desktopAdapter, /runHermesWorkbenchStep/);
  assert.doesNotMatch(desktopAdapter, /runHermesBusinessStep/);
  assert.match(rustSource, /run_hermes_oneshot/);
  assert.match(rustSource, /"chat",\s*"-q"/);
  assert.match(rustSource, /"--max-turns",\s*"3"/);
  assert.match(rustSource, /session_id:\s*Option<String>/);
  assert.match(rustSource, /extract_hermes_session_id/);
  assert.match(rustSource, /let session_id = extract_hermes_session_id\(&stderr\)/);
  assert.doesNotMatch(rustSource, /extract_hermes_session_id\(&combined\)/);
  assert.match(rustSource, /validate_hermes_session_id\(request\.session_id\.as_deref\(\)\)\?/);
  assert.match(rustSource, /let workspace_dir = qarko_workspace_dir[\s\S]*let runtime_dir = qarko_local_app_dir/);
  assert.match(rustSource, /"--resume",\s*session_id\.as_str\(\)/);
  assert.match(rustSource, /workspace_path:\s*Option<String>/);
  assert.match(rustSource, /open_qarko_workspace_path/);
  assert.match(desktopAdapter, /workspacePath\?: string/);
  assert.match(desktopAdapter, /sessionId\?: string/);
  assert.match(desktopAdapter, /openQarkoWorkspacePath/);
  assert.match(storeSource, /await runHermesWorkbenchStep/);
  assert.doesNotMatch(storeSource, /runHermesBusinessStep/);
  assert.match(storeSource, /hasTauriRuntime/);
  assert.match(storeSource, /isBrowserPreview/);
  assert.match(storeSource, /provider\.authType === "api-key"/);
  assert.match(storeSource, /persistedHermesStatus/);
  assert.match(storeSource, /!isBrowserPreview\s*&&\s*provider\.authType === "api-key"\s*&&\s*!state\.hermesConnection\.apiKey\.trim\(\)/);
  assert.match(storeSource, /state\.hermesStatus === "connected"\s*&&\s*provider\.authType === "api-key"/);
  assert.match(storeSource, /projectRun\.status === "running"/);
  assert.match(storeSource, /result\.ok\s*\?\s*"completed"\s*:\s*"failed"/);
  assert.match(storeSource, /artifacts:\s*result\.ok/);
  assert.match(desktopAdapter, /apiKey:\s*string/);
  assert.match(rustSource, /command\.env/);
  assert.match(rustSource, /api_key_name_for_provider\(provider\)\.is_some\(\)\s*&&\s*api_key\.is_empty\(\)/);
  assert.match(rustSource, /hermes_verified_for_execution/);
  assert.match(rustSource, /fn verified_hermes_executable[\s\S]*hermes_verified_for_execution\(&hermes\)/);
  assert.match(rustSource, /fn hermes_status[\s\S]*let verified = hermes_verified_for_execution\(&path\)/);
  assert.match(rustSource, /verified,\s*executable_path/);
  assert.match(desktopAdapter, /verified\?: boolean/);
  assert.match(storeSource, /status\.installed && status\.verified !== false/);
  assert.match(rustSource, /fn open_visible_hermes_terminal[\s\S]*verified_hermes_executable\(\)\?/);
  assert.match(rustSource, /fn configure_hermes[\s\S]*verified_hermes_executable\(\)\?/);
  assert.match(rustSource, /fn check_hermes_auth_status[\s\S]*verified_hermes_executable\(\)\?/);
  assert.match(rustSource, /open_hermes_setup_terminal/);
  assert.match(rustSource, /open_hermes_login_terminal/);
  assert.match(rustSource, /"auth",\s*"add",\s*provider,\s*"--type",\s*"oauth"/);
  assert.match(rustSource, /wait_for_auth_output/);
  assert.match(rustSource, /qarko-hermes-auth/);
  assert.match(rustSource, /login_hermes_provider/);
  assert.match(rustSource, /check_hermes_auth_status/);
  assert.match(rustSource, /write_hermes_verified_marker/);
  assert.match(rustSource, /exe_sha256/);
  assert.match(rustSource, /file_sha256_hex/);
  assert.match(rustSource, /Stdio::piped/);
  assert.match(rustSource, /qarko-hermes-prompt/);
  assert.match(rustSource, /qarko_workspace_dir/);
  assert.match(rustSource, /toolsets/);
  assert.doesNotMatch(rustSource, /Workspace:\s*\{\}/);
  assert.match(storeSource, /toolsetsForHermesPreset/);
  assert.doesNotMatch(storeSource, /toolsetsForAutomationMode/);
  assert.match(rustSource, /current_dir\(&workspace_dir\)/);
  assert.match(desktopAdapter, /HermesHealthReport/);
  assert.match(desktopAdapter, /configureHermesToolPreset/);
  assert.match(storeSource, /path:\s*result\.workspacePath/);
  assert.match(storeSource, /type:\s*"workspace"/);
  assert.match(storeSource, /feedback|reviewNotes/);
  assert.match(storeSource, /isTrustedSyncEndpoint/);
  assert.match(storeSource, /currentRun\.id !== runId/);
  assert.match(storeSource, /redactSensitiveText/);
  assert.match(storeSource, /sanitizeRunForStorage/);
  assert.match(storeSource, /sanitizeRunForCloud/);
  assert.match(storeSource, /hermesSessionId:\s*undefined/);
  assert.match(storeSource, /sanitizeArtifactForStorage/);
  assert.match(storeSource, /const sanitizeArtifactForCloud[\s\S]*path:\s*undefined/);
  assert.match(storeSource, /makeWorkspaceSnapshot[\s\S]*activeRun:\s*sanitizeRunForCloud\(state\.activeRun\)/);
  assert.match(storeSource, /makeWorkspaceSnapshot[\s\S]*projectRuns:\s*projectRunsWithActiveRunForCloud\(state\.projectRuns,\s*state\.activeRun\)/);
  assert.match(storeSource, /makeWorkspaceSnapshot[\s\S]*artifacts:\s*state\.artifacts\.map\(sanitizeArtifactForCloud\)/);
  assert.match(storeSource, /applyWorkspaceSnapshot[\s\S]*artifacts:\s*snapshot\.artifacts\.map\(sanitizeArtifactForCloud\)/);
  assert.match(storeSource, /clearPendingApprovalsAfterCloudLoad/);
  assert.match(storeSource, /status === "pending"[\s\S]*status:\s*"cancelled"/);
  assert.match(storeSource, /applyWorkspaceSnapshot[\s\S]*projectPendingPrompts:\s*\{\}/);
  assert.match(storeSource, /applyWorkspaceSnapshot[\s\S]*pendingPrompt:\s*""/);
  assert.match(storeSource, /saveWorkspaceSnapshot[\s\S]*set\(\(current\) =>/);
  assert.match(storeSource, /activeRun:\s*current\.activeRun/);
  assert.match(storeSource, /projectRuns:\s*current\.projectRuns/);
  assert.match(storeSource, /approvals:\s*current\.approvals/);
  assert.match(storeSource, /projectPendingPrompts:\s*current\.projectPendingPrompts/);
  assert.match(storeSource, /pendingPrompt:\s*restoredSnapshot\.selectedProjectId/);
  assert.match(redactionSource, /redacted_local_path/);
  assert.match(redactionSource, /redacted_discord_webhook/);
  assert.match(redactionSource, /Bearer \[redacted\]/);
  assert.match(storeSource, /sanitizeProjectForStorage/);
  assert.match(storeSource, /sanitizeFeedbackForStorage/);
  assert.match(storeSource, /approvalFingerprintForPrompt/);
  assert.match(storeSource, /activeRun:\s*sanitizeRunForStorage\(state\.activeRun\)/);
  assert.match(storeSource, /artifacts:\s*state\.artifacts\.map\(sanitizeArtifactForStorage\)/);
  assert.match(storeSource, /projects:\s*state\.projects\.map\(sanitizeProjectForStorage\)/);
  assert.match(typeSource, /sessionTranscript\?:\s*string/);
  assert.match(typeSource, /hermesSessionId\?:\s*string/);
  assert.match(storeSource, /sessionId:\s*projectRun\.hermesSessionId/);
  assert.match(storeSource, /hermesSessionId:\s*result\.sessionId\s*\?\?/);
  assert.match(storeSource, /errorMessage\.toLowerCase\(\)\.includes\("session id"\)/);
  assert.match(storeSource, /hermesSessionId:\s*undefined/);
  assert.match(storeSource, /const appendSessionTranscript/);
  assert.match(storeSource, /sessionTranscript:\s*appendSessionTranscript/);
  assert.match(storeSource, /const buildHermesRunContext/);
  assert.match(storeSource, /run\.sessionTranscript/);
  assert.match(storeSource, /Project session transcript/);
  assert.doesNotMatch(storeSource, /run\.logs\s*\.\s*slice\(-8\)/);
  assert.match(storeSource, /needsManualApprovalForPrompt\(userPrompt\)/);
  assert.doesNotMatch(storeSource, /project\.automationMode !== "automation"[\s\S]{0,120}needsManualApprovalForPrompt\(userPrompt\)/);
  assert.match(storeSource, /status:\s*"pending"/);
  assert.match(storeSource, /status:\s*"needs_approval"/);
  assert.match(storeSource, /projectPendingPrompts:\s*nextProjectPendingPrompts/);
  assert.match(storeSource, /nextProjectPendingPrompts\[approval\.projectId\]/);
  assert.doesNotMatch(storeSource, /pendingPrompt:\s*decision === "approved" \? state\.pendingPrompt : ""/);
  assert.match(storeSource, /redactSensitiveText\(userPrompt\)/);
  assert.match(storeSource, /safeFeedback = state\.feedback\.map\(sanitizeFeedbackForStorage\)/);
  assert.match(storeSource, /sendFeedbackEntries\(state\.syncEndpoint, safeFeedback\)/);
});

test("redaction removes Discord webhooks and bearer tokens before persistence", () => {
  const redacted = redactSensitiveText(
    'Send https://discord.com/api/webhooks/1234567890/abcdef.SECRET and Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890'
  );

  assert.match(redacted, /\[redacted_discord_webhook\]/);
  assert.match(redacted, /Bearer \[redacted\]/);
  assert.doesNotMatch(redacted, /discord\.com\/api\/webhooks/);
  assert.doesNotMatch(redacted, /abcdefghijklmnopqrstuvwxyz1234567890/);
});

test("QARKO beta uses Korean workbench-first Hermes onboarding", () => {
  const onboardingSource = readFileSync("src/components/onboarding/HermesOnboarding.tsx", "utf8");
  const dashboardSource = readFileSync("src/components/dashboard/WorkspaceDashboard.tsx", "utf8");
  const executionPanel = readFileSync("src/components/execution/ExecutionPanel.tsx", "utf8");
  const mockDataSource = readFileSync("src/data/mockData.ts", "utf8");
  const typeSource = readFileSync("src/types/qarko.ts", "utf8");
  const storeSource = readFileSync("src/store/useQarkoStore.ts", "utf8");

  assert.match(onboardingSource, /Hermes 작업실 준비/);
  assert.match(onboardingSource, /작업 엔진/);
  assert.match(onboardingSource, /전체 점검 실행/);
  assert.match(onboardingSource, /브라우저 로그인 시작/);
  assert.match(onboardingSource, /인증 완료 확인/);
  assert.match(onboardingSource, /터미널 응답을 기다릴 필요는 없습니다/);
  assert.match(onboardingSource, /업무 능력 프리셋/);
  assert.doesNotMatch(onboardingSource, /Hermes setup wizard/);
  assert.doesNotMatch(onboardingSource, /Open auth terminal/);
  assert.doesNotMatch(onboardingSource, /인증 터미널/);

  assert.match(typeSource + mockDataSource + storeSource + dashboardSource, /샌드박스\(안전 승인 모드\)/);
  assert.match(typeSource + mockDataSource + dashboardSource + executionPanel, /OS 수준 파일 격리/);
  assert.match(typeSource + mockDataSource + dashboardSource + executionPanel, /검증된 Hermes 실행 파일/);
  assert.match(mockDataSource, /보기\/초안 모드/);
  assert.match(mockDataSource, /자동 실행 모드/);

  assert.match(dashboardSource, /Hermes Workbench/);
  assert.match(dashboardSource, /한 세션 안에서 Hermes와 계속 대화/);
  assert.match(dashboardSource, /안전 승인 모드/);
  assert.match(dashboardSource, /새 프로젝트/);
  assert.match(dashboardSource, /Hermes 실행/);
  assert.match(dashboardSource, /textarea/);
  assert.match(dashboardSource, /Hermes Workbench/);
  assert.doesNotMatch(dashboardSource, /MVP Workbench/);
  assert.doesNotMatch(dashboardSource, /새 MVP 프로젝트/);
  assert.doesNotMatch(mockDataSource, /Threads Marketing Sprint/);
  assert.doesNotMatch(mockDataSource, /Blog SEO Assistant/);
  assert.doesNotMatch(mockDataSource, /Social Publisher/);
  assert.match(dashboardSource, /chat-viewport/);
  assert.match(dashboardSource, /currentSessionLogs/);
  assert.doesNotMatch(dashboardSource, /Hermes 결과/);
  assert.match(dashboardSource, /const selectedMode = selectedProject\?\.automationMode \?\? mode/);
  assert.match(dashboardSource, /runWorkbenchTask\(trimmed,\s*selectedMode\)/);
  assert.match(dashboardSource, /selectedMode === item/);
  assert.match(dashboardSource, /runWorkbenchTask/);
  assert.match(storeSource, /runWorkbenchTask/);
  assert.match(storeSource, /pendingPrompt/);
  assert.match(storeSource, /projectRuns:\s*Record<string,\s*Run>/);
  assert.match(storeSource, /projectPendingPrompts:\s*Record<string,\s*string>/);
  assert.match(typeSource, /projectRuns\?:\s*Record<string,\s*Run>/);
  assert.match(storeSource, /projectRuns:\s*\{\}/);
  assert.match(storeSource, /projectPendingPrompts:\s*\{\}/);
  assert.match(storeSource, /state\.projectRuns\[projectId\]\s*\?\?\s*buildRunForProject\(project\)/);
  assert.match(storeSource, /pendingPrompt:\s*project \? state\.projectPendingPrompts\[projectId\]\s*\?\?\s*""/);
  assert.match(storeSource, /\[project\.id\]:\s*initialRun/);
  assert.match(storeSource, /projectPendingPrompts:\s*\{\s*\.\.\.current\.projectPendingPrompts,\s*\[project\.id\]:\s*userPrompt/s);
  assert.match(storeSource, /delete nextProjectPendingPrompts\[project\.id\]/);
  assert.match(storeSource, /sanitizePromptMapForStorage\(state\.projectPendingPrompts\)/);
  assert.match(storeSource, /projectRuns:\s*\{\s*\.\.\.current\.projectRuns,\s*\[project\.id\]:\s*runningRun/s);
  assert.match(storeSource, /status:\s*"running"/);
  assert.match(storeSource, /current\.selectedProjectId === project\.id \? completedRun : current\.activeRun/);
  assert.match(storeSource, /status:\s*result\.ok \? "completed" : "failed"/);
  assert.match(storeSource, /actionNotice:\s*current\.selectedProjectId === project\.id[\s\S]*current\.actionNotice/);
  assert.match(storeSource, /status:\s*"failed"/);
  assert.match(storeSource, /buildHermesChatPrompt/);
  assert.match(storeSource, /roleName:\s*"User"/);
  assert.match(storeSource, /Hermes 세션/);
  assert.match(storeSource, /selectProject:[\s\S]*view:\s*"workspace"/);
  assert.match(storeSource, /createProject:[\s\S]*view:\s*"workspace"/);
  assert.match(storeSource, /중앙 채팅창/);

  assert.match(executionPanel, /실행 로그/);
  assert.match(executionPanel, /산출물/);
  assert.match(executionPanel, /작업 폴더 열기/);
  assert.match(executionPanel, /openQarkoWorkspacePath/);
  assert.match(executionPanel, /workspaceOpenMessage/);
  assert.match(executionPanel, /artifact\.projectId === selectedProjectId/);
  assert.match(executionPanel, /승인/);
  assert.match(executionPanel, /resolveApproval/);
  assert.match(executionPanel, /approval\.projectId === selectedProjectId/);
  assert.match(executionPanel, /expectedResult/);
  assert.match(executionPanel, /피드백/);
  assert.match(executionPanel, /현재 단계 실행/);
});

test("browser preview can run the beta fallback without Tauri", async () => {
  const result = await runHermesWorkbenchStep({
    prompt: "Hermes로 현재 폴더를 분석하고 다음 작업을 제안해줘.",
    modelName: "preview-model",
    provider: "openai-codex",
    apiKey: "",
  });

  assert.equal(result.ok, true);
  assert.equal(typeof result.message, "string");
  assert.equal(result.workspacePath, "browser-preview://workspace");
  assert.match(result.output, /execution draft|Hermes|작업/i);
});

test("browser preview can complete the Hermes setup UX without Tauri", async () => {
  const status = await getHermesDesktopStatus();
  const login = await loginHermesProvider("openai-codex");
  const auth = await checkHermesAuthStatus("openai-codex");
  const model = await configureHermesGuidedSetup({
    provider: "openai-codex",
    modelName: "gpt-5.5",
    apiKey: "",
    endpoint: "",
  });
  const tools = await configureHermesToolPreset("work");
  const health = await getHermesHealthReport();

  assert.equal(status.installed, true);
  assert.equal(status.verified, true);
  assert.equal(login.ok, true);
  assert.match(login.output, /QARKO-DEMO/);
  assert.equal(auth.ok, true);
  assert.equal(model.ok, true);
  assert.equal(tools.ok, true);
  assert.equal(health.ok, true);
});

test("cloud sync trust rejects localhost lookalike hosts", () => {
  assert.equal(isTrustedSyncEndpoint("https://qarko-os-production.up.railway.app/api"), true);
  assert.equal(isTrustedSyncEndpoint("http://localhost:3000/api"), true);
  assert.equal(isTrustedSyncEndpoint("http://127.0.0.1:3000/api"), true);
  assert.equal(isTrustedSyncEndpoint("https://localhost.attacker.example/api"), false);
  assert.equal(isTrustedSyncEndpoint("https://127.0.0.1.attacker.example/api"), false);
  assert.equal(isTrustedSyncEndpoint("https://evil-railway.app/api"), false);
});
