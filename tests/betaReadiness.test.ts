import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runHermesBusinessStep } from "../src/adapters/hermesDesktop";
import { isTrustedSyncEndpoint } from "../src/adapters/workspaceSync";

test("beta workspace starts without seeded sample projects", () => {
  const storeSource = readFileSync("src/store/useQarkoStore.ts", "utf8");

  assert.match(storeSource, /projects:\s*\[\]/);
  assert.match(storeSource, /selectedProjectId:\s*""/);
  assert.match(storeSource, /view:\s*"new-project"/);
  assert.match(storeSource, /approvals:\s*\[\]/);
  assert.match(storeSource, /artifacts:\s*\[\]/);
  assert.match(storeSource, /qarko-os-workspace-v4/);
});

test("next-step execution is wired to real Hermes one-shot generation", () => {
  const desktopAdapter = readFileSync("src/adapters/hermesDesktop.ts", "utf8");
  const rustSource = readFileSync("src-tauri/src/lib.rs", "utf8");
  const storeSource = readFileSync("src/store/useQarkoStore.ts", "utf8");

  assert.match(desktopAdapter, /runHermesBusinessStep/);
  assert.match(rustSource, /run_hermes_oneshot/);
  assert.match(rustSource, /"chat",\s*"-q"/);
  assert.match(rustSource, /"--max-turns",\s*"3"/);
  assert.match(storeSource, /await runHermesBusinessStep/);
  assert.match(storeSource, /hasTauriRuntime/);
  assert.match(storeSource, /isBrowserPreview/);
  assert.match(storeSource, /provider\.authType === "api-key"/);
  assert.match(storeSource, /persistedHermesStatus/);
  assert.match(storeSource, /!isBrowserPreview\s*&&\s*provider\.authType === "api-key"\s*&&\s*!state\.hermesConnection\.apiKey\.trim\(\)/);
  assert.match(storeSource, /state\.hermesStatus === "connected"\s*&&\s*provider\.authType === "api-key"/);
  assert.match(storeSource, /activeRun\.status === "running"/);
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
  assert.match(rustSource, /login_hermes_provider/);
  assert.match(rustSource, /check_hermes_auth_status/);
  assert.match(rustSource, /write_hermes_verified_marker/);
  assert.match(rustSource, /exe_sha256/);
  assert.match(rustSource, /file_sha256_hex/);
  assert.match(rustSource, /Stdio::piped/);
  assert.match(rustSource, /qarko-hermes-prompt/);
  assert.match(storeSource, /feedback|reviewNotes/);
  assert.match(storeSource, /isTrustedSyncEndpoint/);
  assert.match(storeSource, /current\.activeRun\.id !== runId/);
});

test("browser preview can run the beta fallback without Tauri", async () => {
  const result = await runHermesBusinessStep({
    prompt: "?뚯뒪???꾨줈?앺듃",
    modelName: "preview-model",
    provider: "openai-codex",
    apiKey: "",
  });

  assert.equal(result.ok, true);
  assert.equal(typeof result.message, "string");
  assert.match(result.output, /MVP/);
});

test("cloud sync trust rejects localhost lookalike hosts", () => {
  assert.equal(isTrustedSyncEndpoint("https://qarko-os-production.up.railway.app/api"), true);
  assert.equal(isTrustedSyncEndpoint("http://localhost:3000/api"), true);
  assert.equal(isTrustedSyncEndpoint("http://127.0.0.1:3000/api"), true);
  assert.equal(isTrustedSyncEndpoint("https://localhost.attacker.example/api"), false);
  assert.equal(isTrustedSyncEndpoint("https://127.0.0.1.attacker.example/api"), false);
  assert.equal(isTrustedSyncEndpoint("https://evil-railway.app/api"), false);
});
