import assert from "node:assert/strict";
import { test } from "node:test";

import { testHermesConnection } from "../src/adapters/hermesRuntime";

test("Hermes connection test calls OpenAI-compatible models endpoint with API key", async () => {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const result = await testHermesConnection(
    {
      endpoint: "http://localhost:11434/v1/",
      apiKey: "secret-key",
      modelName: "hermes-3",
    },
    async (url, init) => {
      calls.push({ url: String(url), headers: init?.headers as Record<string, string> });
      return new Response(JSON.stringify({ data: [{ id: "hermes-3" }, { id: "llama-3" }] }), { status: 200 });
    }
  );

  assert.equal(calls[0].url, "http://localhost:11434/v1/models");
  assert.equal(calls[0].headers.authorization, "Bearer secret-key");
  assert.equal(result.status, "connected");
  assert.equal(result.modelName, "hermes-3");
  assert.deepEqual(result.availableModels, ["hermes-3", "llama-3"]);
});

test("Hermes connection test reports a missing configured model", async () => {
  const result = await testHermesConnection(
    {
      endpoint: "http://localhost:11434/v1",
      apiKey: "",
      modelName: "missing-model",
    },
    async () => new Response(JSON.stringify({ data: [{ id: "hermes-3" }] }), { status: 200 })
  );

  assert.equal(result.status, "error");
  assert.match(result.message, /missing-model/);
});

test("Hermes connection test reports HTTP failures clearly", async () => {
  const result = await testHermesConnection(
    {
      endpoint: "http://localhost:11434/v1",
      apiKey: "",
      modelName: "",
    },
    async () => new Response(JSON.stringify({ error: { message: "unauthorized" } }), { status: 401 })
  );

  assert.equal(result.status, "error");
  assert.match(result.message, /401/);
  assert.match(result.message, /unauthorized/);
});
