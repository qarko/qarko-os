export const redactSensitiveText = (value: string) =>
  value
    .replace(/\b[A-Za-z]:\\Users\\[^\\\r\n]+\\[^\r\n]*/g, "[redacted_local_path]")
    .replace(/\b[A-Za-z]:\/Users\/[^\/\r\n]+\/[^\r\n]*/g, "[redacted_local_path]")
    .replace(/https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/[^\s"'<>]+/gi, "[redacted_discord_webhook]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]")
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|pk-[A-Za-z0-9_-]{12,})\b/g, "[redacted_api_key]")
    .replace(/\b([A-Za-z0-9_-]*api[_-]?key[A-Za-z0-9_-]*\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/\b([A-Za-z0-9_-]*(token|secret|password|passwd|pwd)[A-Za-z0-9_-]*\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/\b(ghp|github_pat|xox[baprs]|hf|rk|anthropic|openai|AIza)[A-Za-z0-9_:\-.]{16,}\b/g, "[redacted_secret]");
