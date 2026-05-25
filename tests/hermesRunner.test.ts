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
