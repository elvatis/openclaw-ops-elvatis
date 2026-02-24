# openclaw-ops

Local ops plugin.

Commands:
- `/cron` - list cron jobs + scripts + recent reports
- `/privacy-scan` - run the GitHub privacy scan and show latest report path
- `/limits` - show provider auth expiry + observed cooldown windows
- `/release` - show staging gateway + human GO checklist (QA gate)
- `/staging-smoke` - install all `openclaw-*` plugins into the staging profile, restart gateway, and verify status (writes report)
- `/handoff` - show latest openclaw-ops handoff log tail

GitHub Actions:
- `openclaw-triage-labels` (labeling-only): scans `homeofe/openclaw-*` repos and applies labels `security`, `bug`, or `needs-triage`.
  - Uses `secrets.GITHUB_TOKEN` by default.
  - Optional override: define repo secret `TRIAGE_GH_TOKEN`.

Install locally:
```bash
openclaw plugins install -l ~/.openclaw/workspace/openclaw-ops
openclaw gateway restart
```
