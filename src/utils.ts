/**
 * Shared utility functions for openclaw-ops.
 *
 * Extracted from index.ts and extensions/phase1-commands.ts to eliminate
 * duplication and provide a single source of truth.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Expand a leading `~` or `~/` to the user's home directory. */
export function expandHome(p: string): string {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

// ---------------------------------------------------------------------------
// Shell / process helpers
// ---------------------------------------------------------------------------

/**
 * Run a shell command synchronously, returning trimmed stdout on success
 * or an empty string on failure. Stderr is suppressed.
 */
export function safeExec(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

/**
 * Run a command with arguments via `spawnSync`, returning the exit code and
 * combined stdout+stderr output.
 *
 * @param cmd       - The executable to run.
 * @param args      - Array of arguments.
 * @param timeoutMs - Timeout in milliseconds (default 120 000 - two minutes).
 */
export function runCmd(
  cmd: string,
  args: string[],
  timeoutMs = 120_000,
): { code: number; out: string } {
  try {
    const p = spawnSync(cmd, args, {
      encoding: "utf-8",
      timeout: timeoutMs,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out = `${p.stdout ?? ""}\n${p.stderr ?? ""}`.trim();
    return { code: p.status ?? (p.error ? 1 : 0), out };
  } catch (e: any) {
    return { code: 1, out: String(e?.message ?? e) };
  }
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/**
 * Return the filename of the most recently modified file in `dir` whose name
 * starts with `prefix`, or `null` if none is found.
 */
export function latestFile(dir: string, prefix: string): string | null {
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

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Format a byte count into a human-readable string (B, KB, MB, GB). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)}GB`;
}

// ---------------------------------------------------------------------------
// System inspection helpers
// ---------------------------------------------------------------------------

/** Gather CPU load, memory usage, and disk usage for the current host. */
export function getSystemResources(): { cpu: string; memory: string; disk: string } {
  const platform = os.platform();

  // CPU load
  const loadavg = os.loadavg();
  const cpu = `${loadavg[0].toFixed(2)}, ${loadavg[1].toFixed(2)}, ${loadavg[2].toFixed(2)}`;

  // Memory
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
  const memory = `${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)`;

  // Disk (platform-specific)
  let disk = "N/A";
  try {
    if (platform === "linux" || platform === "darwin") {
      const df = safeExec("df -h /");
      const lines = df.split("\n");
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        disk = `${parts[4] || "N/A"} used (${parts[2] || "?"} / ${parts[1] || "?"})`;
      }
    } else if (platform === "win32") {
      const driveInfo = safeExec(
        'wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv',
      );
      const match = driveInfo.match(/\d+,\d+,(\d+)/);
      if (match) disk = `${formatBytes(parseInt(match[1]))} free`;
    }
  } catch {
    // Keep N/A
  }

  return { cpu, memory, disk };
}

/**
 * Check whether the OpenClaw gateway is running for a given profile.
 * Returns running state, optional PID, and optional uptime string.
 */
export function checkGatewayStatus(
  profile = "default",
): { running: boolean; pid?: number; uptime?: string } {
  const profileArg = profile === "default" ? [] : ["--profile", profile];
  const result = runCmd("openclaw", [...profileArg, "gateway", "status"], 10_000);

  const running = result.code === 0 && result.out.toLowerCase().includes("running");

  let pid: number | undefined;
  let uptime: string | undefined;
  const pidMatch = result.out.match(/PID[:\s]+(\d+)/i);
  if (pidMatch) pid = parseInt(pidMatch[1]);

  const uptimeMatch = result.out.match(/uptime[:\s]+(.+?)(?:\n|$)/i);
  if (uptimeMatch) uptime = uptimeMatch[1].trim();

  return { running, pid, uptime };
}
