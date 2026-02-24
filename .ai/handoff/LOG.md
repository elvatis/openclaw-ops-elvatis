# LOG

- 2026-02-24: Created openclaw-ops with /cron + /privacy-scan.
- 2026-02-24: Added /limits (auth expiry + cooldown windows).
- 2026-02-25: Adjusted `assets/logo-256.png` to keep the logo centered within GitHub avatar safe area.
- 2026-02-25: Disabled 40 risky GitHub automation cron jobs (`ghwatch-*` and `ghtriage-*`) that could auto-spawn fix agents / open PRs.
- 2026-02-25: Added GitHub Actions workflow `openclaw-triage-labels` (labeling-only) + `scripts/triage_labels.py` to triage and label issues across all `homeofe/openclaw-*` repos (skip archived/forks). Commit: 0275eb0.
- 2026-02-25: Updated `openclaw-triage-labels` to use `secrets.GITHUB_TOKEN` by default (with `issues: write`), optional override via `TRIAGE_GH_TOKEN`. Documented in README.
- 2026-02-25: Added QA documentation + commands: `RELEASE.md` (staging gateway + GO checklist), `/release` (prints QA gate), `/handoff` (shows recent handoff log tail). Updated README command list.
- 2026-02-25: Updated Elvatis blog post “How I Run an Autonomous AI Assistant Without Losing Control” live via Ghost Admin API: added `openclaw-ops` to plugin stack, tightened wording around self-healing scope, updated rollout discipline section to include staging + human GO, and extended the conclusion with QA gate step.
- 2026-02-25: Overnight QA run (local, no install): ran `npm run build --if-present` + `npm test --if-present` across 14 `openclaw-*` repos. All passed except `openclaw-memory-core` test failure in `tests/store.test.ts` (expects 'Dubai' in top search hit).
- 2026-02-25: Created/initialized OpenClaw **staging** profile locally on the same machine (state dir `~/.openclaw-staging/`). Updated `RELEASE.md` to document staging gateway + GO flow.
- 2026-02-25: Policy update: staging smoke tests must be run for **all** `openclaw-*` repos before rollout/publish; documented in `RELEASE.md`.
- 2026-02-25: Publish gate decision: ClawHub publish uses Option 2 (CI green + staging smoke green). User requested guarantees; we can provide best-effort safety gates and rollback, not absolute guarantees.
- 2026-02-25: Implemented `/staging-smoke` in openclaw-ops to run sequential staging installs for all `openclaw-*` repos (with `openclaw.plugin.json`), restart staging gateway, run `openclaw --profile staging status`, and write report to `cron/reports/staging-smoke_*.txt`. Updated README.
- 2026-02-25: Ran staging smoke via CLI loop (single-host constraint, avoid repeated restarts). Failed immediately on `openclaw-docker`: `openclaw plugins install` reports `package.json missing openclaw.extensions`. Report: `cron/reports/staging-smoke_202602242352.txt`.
