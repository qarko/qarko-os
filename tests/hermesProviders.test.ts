import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { getHermesProviderOption, hermesProviderOptions } from "../src/data/hermesProviders";

test("OpenAI Codex OAuth exposes the Hermes curated model choices", () => {
  const provider = getHermesProviderOption("openai-codex");
  const modelIds = provider.modelOptions.map((model) => model.id);

  assert.equal(provider.authType, "oauth");
  assert.equal(provider.hermesProviderId, "openai-codex");
  assert.ok(modelIds.includes("gpt-5.5"));
  assert.ok(modelIds.includes("gpt-5.3-codex-spark"));
  assert.ok(modelIds.includes(provider.defaultModel));
});

test("OpenAI API provider offers a real model range instead of one hard-coded option", () => {
  const provider = getHermesProviderOption("openai");
  const modelIds = provider.modelOptions.map((model) => model.id);

  assert.equal(provider.authType, "api-key");
  assert.equal(provider.hermesProviderId, "openai");
  assert.ok(modelIds.length >= 6);
  assert.ok(modelIds.includes("gpt-5.4"));
  assert.ok(modelIds.includes("gpt-4o-mini"));
  assert.ok(modelIds.includes(provider.defaultModel));
});

test("every provider with curated choices includes its default model", () => {
  for (const provider of hermesProviderOptions) {
    if (provider.modelOptions.length === 0) continue;
    assert.ok(
      provider.modelOptions.some((model) => model.id === provider.defaultModel),
      `${provider.id} should include ${provider.defaultModel} in modelOptions`
    );
  }
});

test("desktop auth flow uses Hermes guided login and auth status checks", () => {
  const rustSource = readFileSync("src-tauri/src/lib.rs", "utf8");

  assert.match(rustSource, /"auth",\s*"add",\s*provider,\s*"--type",\s*"oauth"/);
  assert.match(rustSource, /extract_first_https_url/);
  assert.match(rustSource, /open_url_in_default_browser/);
  assert.match(rustSource, /"rundll32\.exe"/);
  const openUrlFunction = rustSource.match(/fn open_url_in_default_browser[\s\S]*?\n}\n/)?.[0] ?? "";
  assert.doesNotMatch(openUrlFunction, /"cmd\.exe"[\s\S]*"start"/);
  assert.match(rustSource, /"auth",\s*"status"/);
  assert.match(rustSource, /"auth",\s*"list"/);
  assert.match(rustSource, /provider_auth_output/);
  assert.match(rustSource, /provider_auth_lower/);
  assert.match(rustSource, /hermes_health/);
  assert.match(rustSource, /configure_hermes_tool_preset/);
  assert.match(rustSource, /"model\.default"/);
  assert.match(rustSource, /"model\.provider"/);
  assert.match(rustSource, /"model\.base_url"/);
  assert.match(rustSource, /"model\.api_mode"/);
  assert.match(rustSource, /api_mode\.unwrap_or\(""\)/);
});
