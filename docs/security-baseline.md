# QARKO OS Security Baseline

## Current Beta Rules

- Do not commit API keys, OAuth secrets, or admin tokens to the repository.
- Do not embed model provider API keys in the frontend bundle.
- QARKO OS should not persist model API keys in localStorage.
- Tester feedback submission can be public during beta, but feedback retrieval must require an admin token.
- Workspace cloud sync must require an admin token when deployed.
- Installer builds should be distributed only from the current release folder until code signing is added.

## Railway Required Variables

- `QARKO_DATA_FILE=/data/qarko-workspace.json`
- `QARKO_ACCESS_TOKEN=<strong random admin token>`
- `DISCORD_FEEDBACK_WEBHOOK_URL=<Discord channel webhook URL>`

The admin token is entered manually in QARKO OS Settings on the owner's machine. Do not send this token to testers. The Discord webhook URL must stay on Railway only; never put it in frontend code, screenshots, docs, or tester builds.

## Beta Data Guidance

Ask testers not to paste paid API keys, private business data, passwords, or customer information into feedback. The feedback form can include an optional name/contact field for follow-up, but this data is protected behind the admin token.

## Pre-Release Checklist

1. Run `npm.cmd test`.
2. Run `npm.cmd run build`.
3. Run `npm.cmd run desktop:installer`.
4. Confirm `/api/feedback` POST works without a token.
5. Confirm `/api/feedback` GET returns `401` without a token when `QARKO_ACCESS_TOKEN` is set.
6. Confirm `/api/workspace` GET/PUT return `401` without a token when `QARKO_ACCESS_TOKEN` is set.
7. Confirm model API key is not stored in the persisted `qarko-os-workspace-v1` state.
