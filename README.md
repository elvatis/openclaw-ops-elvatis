# openclaw-ops

Local ops plugin.

Commands:
- `/cron` - list cron jobs + scripts + recent reports
- `/privacy-scan` - run the GitHub privacy scan and show latest report path

GitHub Actions:
- `openclaw-triage-labels` (labeling-only): scans `homeofe/openclaw-*` repos and applies labels `security`, `bug`, or `needs-triage`.
  - Uses `secrets.GITHUB_TOKEN` by default.
  - Optional override: define repo secret `TRIAGE_GH_TOKEN`.

Install locally:
```bash
openclaw plugins install -l ~/.openclaw/workspace/openclaw-ops
openclaw gateway restart
```
