import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  getHermesInstallCommand,
  getHermesUpdateCommand,
  getHermesVerifiedInstallPlan,
} from "../src/adapters/hermesDesktop";

test("Hermes installer command uses the official Windows installer in setup-skipping mode", () => {
  const command = getHermesInstallCommand();

  assert.equal(command.program, "powershell.exe");
  assert.ok(command.args.includes("-ExecutionPolicy"));
  assert.ok(command.args.includes("Bypass"));
  assert.match(command.script, /NousResearch\/hermes-agent\/[a-f0-9]{40}\/scripts\/install\.ps1/);
  assert.match(command.script, /Get-FileHash -Algorithm SHA256/);
  assert.match(command.script, /Hermes installer hash mismatch/);
  assert.match(command.script, /-SkipSetup/);
  assert.match(command.script, /-NonInteractive/);
});

test("Hermes verified install plan exposes the pinned version and dependency policy", () => {
  const plan = getHermesVerifiedInstallPlan();

  assert.equal(plan.channel, "verified");
  assert.match(plan.hermesCommit, /^[a-f0-9]{40}$/);
  assert.match(plan.installScriptSha256, /^[A-F0-9]{64}$/);
  assert.equal(plan.allowUnverifiedLatest, false);
  assert.ok(plan.dependencies.some((dependency) => dependency.name === "Hermes Agent"));
  assert.ok(plan.dependencies.every((dependency) => dependency.policy.length > 0));
});

test("Hermes verified update command reuses the pinned install script and commit", () => {
  const plan = getHermesVerifiedInstallPlan();
  const command = getHermesUpdateCommand();

  assert.equal(command.program, "powershell.exe");
  assert.match(command.script, new RegExp(`${plan.hermesCommit}`));
  assert.match(command.script, new RegExp(`${plan.installScriptSha256}`));
  assert.match(command.script, /-Commit '[a-f0-9]{40}'/);
  assert.match(command.script, /-SkipSetup/);
  assert.match(command.script, /-NonInteractive/);
});

test("Hermes desktop metadata matches the Rust installer command constants", () => {
  const plan = getHermesVerifiedInstallPlan();
  const rustSource = readFileSync("src-tauri/src/lib.rs", "utf8");

  assert.match(rustSource, new RegExp(`HERMES_INSTALL_COMMIT: &str = "${plan.hermesCommit}"`));
  assert.match(rustSource, new RegExp(`HERMES_INSTALL_SHA256: &str = "${plan.installScriptSha256}"`));
});
