import { describe, it, expect, vi, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import { expandHome, safeExec, runCmd, latestFile, formatBytes } from "./utils.js";

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
