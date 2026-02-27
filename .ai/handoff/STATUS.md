# openclaw-ops: Current State of the Nation

> Last updated: 2026-02-27 by claude-opus-4.6 (T-002 cooldown detection)
> Commit: pending
>
> **Rule:** This file is rewritten (not appended) at the end of every session.
> It reflects the *current* reality, not history. History lives in LOG.md.

---

<!-- SECTION: summary -->
Active plugin at v0.2.0. Phase 1 commands (/health, /services, /logs, /plugins) implemented alongside legacy commands (/cron, /privacy-scan, /limits, /release, /handoff, /staging-smoke). /health now includes active cooldown detection from model-failover state. /limits refactored to use shared cooldown utility. Triage CI suspended. v0.2 roadmap in progress.
<!-- /SECTION: summary -->

<!-- SECTION: build_health -->
## Build Health

| Check | Result | Notes |
|-------|--------|-------|
| `tsc --noEmit` | Pass | Verified 2026-02-27 |
| `npm test` | Pass (27 tests) | Vitest configured, 27 tests passing |
| `lint` | (Unknown) | Not configured |

<!-- /SECTION: build_health -->

---

<!-- SECTION: commands -->
## Commands

| Command | Status | Notes |
|---------|--------|-------|
| `/health` | Active | Gateway status, system resources, plugin count, model cooldowns, recent errors |
| `/services` | Active | Profile listing, gateway state per profile, port bindings |
| `/logs` | Active | Unified log viewer with service and line-count args |
| `/plugins` | Active | Enhanced plugin dashboard with versions and workspace info |
| `/cron` | Active | Shows crontab + systemd timers + scripts + latest reports |
| `/privacy-scan` | Active | Report-only, filenames only for secret matches |
| `/limits` | Active | Shows cooldown windows + auth expiry ETAs (uses shared cooldown utility) |
| `/release` | Active | Prints QA gate checklist |
| `/handoff` | Active | Shows recent handoff log tail |
| `/staging-smoke` | Active | Sequential staging installs for all openclaw-* repos |

<!-- /SECTION: commands -->

---

<!-- SECTION: roadmap -->
## v0.2 Roadmap

Defined 2026-02-27. Five GitHub issues created:

| Issue | Title | Priority | Status |
|-------|-------|----------|--------|
| [#1](https://github.com/homeofe/openclaw-ops/issues/1) | Extract shared utilities into a common module | High | Open |
| [#2](https://github.com/homeofe/openclaw-ops/issues/2) | Add test infrastructure and basic command tests | High | Open |
| [#3](https://github.com/homeofe/openclaw-ops/issues/3) | Implement Phase 2 /config command | Medium | Open |
| [#4](https://github.com/homeofe/openclaw-ops/issues/4) | Fix Windows disk usage detection in /health | Medium | Open |
| [#5](https://github.com/homeofe/openclaw-ops/issues/5) | Fix triage CI workflow cross-repo 403 errors | Low | Open |

Recommended order: #1 (refactor) -> #2 (tests) -> #4 (bug fix) -> #3 (new feature) -> #5 (CI fix, requires PAT setup)

<!-- /SECTION: roadmap -->

---

<!-- SECTION: what_is_missing -->
## What is Missing

| Gap | Severity | Description | Tracked |
|-----|----------|-------------|---------|
| Duplicated utility code | HIGH | expandHome, safeExec, runCmd copied between index.ts and phase1-commands.ts | [#1](https://github.com/homeofe/openclaw-ops/issues/1) |
| No tests | HIGH | Zero test coverage, no test framework configured | [#2](https://github.com/homeofe/openclaw-ops/issues/2) |
| Windows disk detection | MEDIUM | Uses deprecated wmic, hardcodes C: drive | [#4](https://github.com/homeofe/openclaw-ops/issues/4) |
| /config command | MEDIUM | Phase 2 - config viewer/validator not yet implemented | [#3](https://github.com/homeofe/openclaw-ops/issues/3) |
| Triage CI | LOW | Suspended - 403 cross-repo failures, needs PAT | [#5](https://github.com/homeofe/openclaw-ops/issues/5) |

<!-- /SECTION: what_is_missing -->

---

<!-- SECTION: safety_rules -->
## Safety Rules

- Never print secrets in command output
- Privacy scan reports list filenames only for secret-like matches, never matched lines
- `/limits` should report windows/ETAs (cooldowns, expiry), not dump all model names

<!-- /SECTION: safety_rules -->

---

## Trust Levels

- **(Verified)**: confirmed by running code/tests
- **(Assumed)**: derived from docs/config, not directly tested
- **(Unknown)**: needs verification
