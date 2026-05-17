import assert from "node:assert/strict";
import { test } from "node:test";

import { getHermesInstallCommand } from "../src/adapters/hermesDesktop";

test("Hermes installer command uses the official Windows installer in setup-skipping mode", () => {
  const command = getHermesInstallCommand();

  assert.equal(command.program, "powershell.exe");
  assert.ok(command.args.includes("-ExecutionPolicy"));
  assert.ok(command.args.includes("Bypass"));
  assert.match(command.script, /NousResearch\/hermes-agent\/main\/scripts\/install\.ps1/);
  assert.match(command.script, /-SkipSetup/);
  assert.match(command.script, /-NonInteractive/);
});
