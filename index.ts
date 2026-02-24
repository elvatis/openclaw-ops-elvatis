import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

function expandHome(p: string): string {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function safeExec(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function latestFile(dir: string, prefix: string): string | null {
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(prefix))
      .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    return files[0]?.f ?? null;
  } catch {
    return null;
  }
}

export default function register(api: any) {
  const cfg = (api.pluginConfig ?? {}) as { enabled?: boolean; workspacePath?: string };
  if (cfg.enabled === false) return;

  const workspace = expandHome(cfg.workspacePath ?? "~/.openclaw/workspace");
  const cronDir = path.join(workspace, "cron");
  const cronScripts = path.join(cronDir, "scripts");
  const cronReports = path.join(cronDir, "reports");

  api.registerCommand({
    name: "cron",
    description: "Show cron dashboard (crontab + systemd timers + scripts + latest reports)",
    requireAuth: false,
    acceptsArgs: false,
    handler: async () => {
      const lines: string[] = [];
      lines.push("Cron dashboard");
      lines.push("");
      lines.push("CRONTAB");

      // 1) user crontab
      const crontab = safeExec("crontab -l");
      if (crontab) {
        const jobs = crontab
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#"));
        lines.push(`jobs (${jobs.length}):`);
        lines.push("```text");
        for (const j of jobs.slice(0, 50)) lines.push(j);
        if (jobs.length > 50) lines.push("... (truncated)");
        lines.push("```");
      } else {
        lines.push("No user crontab entries found (or permission denied).");
      }

      lines.push("");

      // 2) systemd user timers (best-effort)
      lines.push("");
      lines.push("SYSTEMD USER TIMERS");
      const timers = safeExec("systemctl --user list-timers --all --no-pager");
      if (timers) {
        const tlines = timers.split("\n").slice(0, 25);
        lines.push("```text");
        for (const l of tlines) lines.push(l);
        lines.push("```");
      } else {
        lines.push("(none found or systemctl not available)");
      }

      // 3) scripts folder
      lines.push("");
      lines.push("SCRIPTS");
      try {
        const scripts = fs.readdirSync(cronScripts).filter((f) => f.endsWith(".sh"));
        lines.push(`files (${scripts.length}):`);
        lines.push("```text");
        for (const s of scripts.sort()) {
          const st = fs.statSync(path.join(cronScripts, s));
          lines.push(`${s.padEnd(28)}  mtime=${new Date(st.mtimeMs).toISOString()}`);
        }
        lines.push("```");
      } catch {
        lines.push("No cron/scripts directory found.");
      }

      lines.push("");

      // 4) latest reports
      lines.push("");
      lines.push("REPORTS");
      const latestPrivacy = latestFile(cronReports, "github-privacy-scan_");
      if (latestPrivacy) {
        lines.push("latest privacy scan:");
        lines.push("```text");
        lines.push(path.join(cronReports, latestPrivacy));
        lines.push("```");
      } else {
        lines.push("(no privacy scan report yet)");
      }

      return { text: lines.join("\n") };
    },
  });

  api.registerCommand({
    name: "privacy-scan",
    description: "Run GitHub privacy scan (safe, report-only)",
    requireAuth: false,
    acceptsArgs: false,
    handler: async () => {
      const script = path.join(workspace, "ops", "github-privacy-scan.sh");
      if (!fs.existsSync(script)) {
        return { text: `privacy scan script not found: ${script}` };
      }

      // Run and capture tail
      let out = "";
      try {
        out = execSync(`bash ${script}`, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
      } catch (e: any) {
        // Even on non-zero exit, show what we have.
        out = String(e?.stdout ?? "") + "\n" + String(e?.stderr ?? "");
      }

      const report = latestFile(cronReports, "github-privacy-scan_");
      const tail = out.split("\n").slice(-30).join("\n");

      const lines: string[] = [];
      lines.push("Privacy scan finished.");
      if (report) lines.push(`Report: ${path.join(cronReports, report)}`);
      lines.push("");
      lines.push("```text");
      lines.push(tail.trim() || "(no output)");
      lines.push("```");

      return { text: lines.join("\n") };
    },
  });

  api.registerCommand({
    name: "limits",
    description: "Show model/provider auth expiries and status (best-effort)",
    requireAuth: false,
    acceptsArgs: false,
    handler: async () => {
      // Today, `openclaw models status` does not expose per-model rate-limit reset times.
      // What we CAN show reliably is the auth token/OAuth expiry window per provider,
      // which is often the next hard stop in practice.
      const out = safeExec("openclaw models status");
      if (!out) return { text: "Failed to run: openclaw models status" };

      const lines = out.split("\n");

      // Extract key header lines (keep it minimal, no full model dump)
      const pick = (prefix: string) => lines.find((l) => l.startsWith(prefix)) ?? "";
      const header = [pick("Default"), pick("Fallbacks")].filter(Boolean);

      // Extract OAuth/token expiry section
      const startIdx = lines.findIndex((l) => l.trim() === "OAuth/token status");
      const expiry: string[] = [];
      if (startIdx >= 0) {
        for (const l of lines.slice(startIdx + 1)) {
          // stop when another top-level header starts
          if (l.trim() && !l.startsWith("-") && !l.startsWith(" ") && !l.startsWith("\t")) break;
          if (!l.trim()) continue;
          if (/^\s*-\s+/.test(l) || /^\s{2,}-\s+/.test(l)) expiry.push(l);
        }
      }

      const msg: string[] = [];
      msg.push("Limits");

      // Section: Config
      if (header.length) {
        msg.push("");
        msg.push("CONFIG");
        msg.push("```text");
        for (const h of header) msg.push(h);
        msg.push("```");
      }

      // Section: Auth expiry (hard stop)
      msg.push("");
      msg.push("AUTH EXPIRY (hard stop)");
      if (expiry.length) {
        msg.push("```text");
        for (const l of expiry.slice(0, 120)) msg.push(l);
        if (expiry.length > 120) msg.push("... (truncated)");
        msg.push("```");
      } else {
        msg.push("(not found in CLI output)");
      }

      // Section: Rate-limit cooldowns (observed)
      msg.push("");
      msg.push("RATE LIMIT COOLDOWNS (observed)");
      try {
        const statePath = path.join(workspace, "memory", "model-ratelimits.json");
        const now = Math.floor(Date.now() / 1000);

        if (!fs.existsSync(statePath)) {
          msg.push("None recorded yet. (Shows up after first 429/quota event via model-failover.)");
        } else {
          const raw = fs.readFileSync(statePath, "utf-8");
          const st = JSON.parse(raw) as any;
          const lim = (st?.limited ?? {}) as Record<string, { lastHitAt: number; nextAvailableAt: number; reason?: string }>;

          const active = Object.entries(lim)
            .map(([model, v]) => ({ model, ...v }))
            .filter((v) => typeof v.nextAvailableAt === "number" && v.nextAvailableAt > now)
            .sort((a, b) => a.nextAvailableAt - b.nextAvailableAt)
            .slice(0, 50);

          if (!active.length) {
            msg.push("None active.");
          } else {
            // pretty aligned table
            const modelW = Math.min(42, Math.max(...active.map((a) => a.model.length)));
            msg.push("```text");
            msg.push(`${"MODEL".padEnd(modelW)}  UNTIL (UTC)                 ETA`);
            for (const a of active) {
              const etaSec = a.nextAvailableAt - now;
              const etaMin = Math.max(0, Math.round(etaSec / 60));
              const untilIso = new Date(a.nextAvailableAt * 1000).toISOString().replace(".000Z", "Z");
              msg.push(`${a.model.padEnd(modelW)}  ${untilIso}  ~${etaMin}m`);
            }
            msg.push("```");
          }
        }
      } catch {
        msg.push("Failed to read local cooldown state.");
      }

      msg.push("");
      msg.push("NOTE");
      msg.push("OpenClaw does not expose per-model token remaining, quota counters, or official reset timestamps via CLI/API today.");
      msg.push("This command reports provider auth expiry and observed cooldown windows from local failover state.");

      return { text: msg.join("\n") };
    },
  });
}
