import { describe, it, expect, vi, afterEach } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { expandHome, safeExec, runCmd, latestFile, formatBytes, loadActiveCooldowns, formatCooldownLine } from "./utils.js";
import type { CooldownEntry } from "./utils.js";

// ---------------------------------------------------------------------------
// expandHome
// ---------------------------------------------------------------------------
describe("expandHome", () => {
  it("returns empty string for empty input", () => {
    expect(expandHome("")).toBe("");
  });

  it("expands bare tilde to homedir", () => {
    expect(expandHome("~")).toBe(os.homedir());
  });

  it("expands ~/subpath to homedir/subpath", () => {
    const result = expandHome("~/documents/file.txt");
    expect(result).toBe(path.join(os.homedir(), "documents/file.txt"));
  });

  it("leaves absolute paths unchanged", () => {
    const abs = "/usr/local/bin";
    expect(expandHome(abs)).toBe(abs);
  });

  it("leaves relative paths without tilde unchanged", () => {
    expect(expandHome("some/relative/path")).toBe("some/relative/path");
  });
});

// ---------------------------------------------------------------------------
// safeExec
// ---------------------------------------------------------------------------
describe("safeExec", () => {
  it("returns trimmed stdout for a successful command", () => {
    // 'node -e' works cross-platform
    const result = safeExec('node -e "process.stdout.write(\'hello world  \')"');
    expect(result).toBe("hello world");
  });

  it("returns empty string when command fails", () => {
    const result = safeExec("this-command-should-not-exist-anywhere-12345");
    expect(result).toBe("");
  });
});

// ---------------------------------------------------------------------------
// runCmd
// ---------------------------------------------------------------------------
describe("runCmd", () => {
  it("returns exit code 0 and output for a successful command", () => {
    const result = runCmd("node", ["-e", "console.log('test-output')"]);
    expect(result.code).toBe(0);
    expect(result.out).toContain("test-output");
  });

  it("returns non-zero exit code for a failing command", () => {
    const result = runCmd("node", ["-e", "process.exit(42)"]);
    expect(result.code).toBe(42);
  });

  it("returns code 1 when the executable does not exist", () => {
    const result = runCmd("nonexistent-binary-xyz-99999", []);
    expect(result.code).toBe(1);
    // On some platforms the error message may be empty, so we only assert the code
    expect(typeof result.out).toBe("string");
  });

  it("respects custom timeout parameter", () => {
    // A very short timeout should cause a timeout error
    const result = runCmd("node", ["-e", "setTimeout(() => {}, 60000)"], 100);
    // On timeout, spawnSync sets status to null and error is populated
    expect(result.code).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// formatBytes
// ---------------------------------------------------------------------------
describe("formatBytes", () => {
  it("formats bytes below 1 KB", () => {
    expect(formatBytes(512)).toBe("512B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(2.5 * 1024 ** 3)).toBe("2.50GB");
  });

  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0B");
  });
});

// ---------------------------------------------------------------------------
// latestFile
// ---------------------------------------------------------------------------
describe("latestFile", () => {
  it("returns null for a non-existent directory", () => {
    expect(latestFile("/tmp/this-dir-should-not-exist-xyz-12345", "prefix")).toBeNull();
  });

  it("returns null when no files match the prefix", () => {
    // os.tmpdir() exists but is unlikely to have files starting with this prefix
    expect(latestFile(os.tmpdir(), "zzz-nonexistent-prefix-xyz-99999")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadActiveCooldowns
// ---------------------------------------------------------------------------
describe("loadActiveCooldowns", () => {
  const tmpDir = path.join(os.tmpdir(), "openclaw-ops-test-cooldowns-" + process.pid);
  const memoryDir = path.join(tmpDir, "memory");
  const statePath = path.join(memoryDir, "model-ratelimits.json");

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  });

  it("returns empty array when workspace does not exist", () => {
    expect(loadActiveCooldowns("/tmp/nonexistent-workspace-xyz-99999")).toEqual([]);
  });

  it("returns empty array when state file does not exist", () => {
    fs.mkdirSync(memoryDir, { recursive: true });
    expect(loadActiveCooldowns(tmpDir)).toEqual([]);
  });

  it("returns empty array when state file has invalid JSON", () => {
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(statePath, "not-json{{", "utf-8");
    expect(loadActiveCooldowns(tmpDir)).toEqual([]);
  });

  it("returns empty array when no models are in cooldown", () => {
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify({ limited: {} }), "utf-8");
    expect(loadActiveCooldowns(tmpDir)).toEqual([]);
  });

  it("filters out expired cooldowns", () => {
    const pastTime = Math.floor(Date.now() / 1000) - 3600;
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      statePath,
      JSON.stringify({
        limited: {
          "openai/gpt-4": { lastHitAt: pastTime - 100, nextAvailableAt: pastTime },
        },
      }),
      "utf-8",
    );
    expect(loadActiveCooldowns(tmpDir)).toEqual([]);
  });

  it("returns active cooldowns sorted by soonest-to-expire", () => {
    const now = Math.floor(Date.now() / 1000);
    const soon = now + 600;
    const later = now + 3600;
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      statePath,
      JSON.stringify({
        limited: {
          "anthropic/claude-opus": {
            lastHitAt: now - 100,
            nextAvailableAt: later,
            reason: "daily limit",
          },
          "openai/gpt-5": {
            lastHitAt: now - 50,
            nextAvailableAt: soon,
            reason: "rate limit",
          },
        },
      }),
      "utf-8",
    );
    const result = loadActiveCooldowns(tmpDir);
    expect(result).toHaveLength(2);
    expect(result[0].model).toBe("openai/gpt-5");
    expect(result[1].model).toBe("anthropic/claude-opus");
    expect(result[0].reason).toBe("rate limit");
    expect(result[1].reason).toBe("daily limit");
  });
});

// ---------------------------------------------------------------------------
// formatCooldownLine
// ---------------------------------------------------------------------------
describe("formatCooldownLine", () => {
  it("formats a cooldown entry with minutes remaining", () => {
    const now = Math.floor(Date.now() / 1000);
    const entry: CooldownEntry = {
      model: "openai/gpt-5",
      lastHitAt: now - 100,
      nextAvailableAt: now + 1800,
    };
    const line = formatCooldownLine(entry);
    expect(line).toContain("openai/gpt-5");
    expect(line).toContain("UTC");
    expect(line).toMatch(/~\d+m/);
  });

  it("formats hours for long cooldowns", () => {
    const now = Math.floor(Date.now() / 1000);
    const entry: CooldownEntry = {
      model: "anthropic/claude-opus",
      lastHitAt: now - 100,
      nextAvailableAt: now + 7200, // 2 hours
    };
    const line = formatCooldownLine(entry);
    expect(line).toContain("anthropic/claude-opus");
    expect(line).toMatch(/~2h/);
  });

  it("shows at least 1 minute even for very short remaining times", () => {
    const now = Math.floor(Date.now() / 1000);
    const entry: CooldownEntry = {
      model: "test/model",
      lastHitAt: now - 10,
      nextAvailableAt: now + 5, // 5 seconds
    };
    const line = formatCooldownLine(entry);
    expect(line).toMatch(/~1m/);
  });
});
