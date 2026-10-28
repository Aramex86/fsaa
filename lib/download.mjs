/* fsaa/lib/download.mjs — degit-style fetch of a template repo tarball (zero deps).
   Downloads the codeload tar.gz, extracts with the system `tar` (ships with
   Linux, macOS, Windows 10+), then moves the tarball's root folder to the target dir. */
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fetchFile } from "./net.mjs";

export const TEMPLATES = {
  next: { repo: "Aramex86/fsaa-next", label: "Next.js App Router" },
  vite: { repo: "Aramex86/fsaa-vite", label: "plain React (Vite + react-router)" },
};

export function templateLabel(template) {
  return TEMPLATES[template]?.label ?? template;
}

/** Download template@main and unpack its root folder contents into targetDir. */
export async function fetchTemplate(template, targetDir) {
  const t = TEMPLATES[template];
  if (!t) throw new Error(`unknown template "${template}"`);
  const tmp = mkdtempSync(join(tmpdir(), "fsaa-template-"));
  try {
    const tgz = join(tmp, "template.tar.gz");
    writeFileSync(tgz, await fetchFile(TARBALL_URL(t.repo)));
    const x = join(tmp, "x");
    mkdirSync(x, { recursive: true });
    const r = spawnSync("tar", ["-xzf", tgz, "-C", x], { stdio: "pipe" });
    if (r.status !== 0) {
      const msg = (r.stderr || "tar not found on PATH").toString().trim().slice(0, 160);
      throw new Error(`tar extract failed: ${msg}`);
    }
    const entries = readdirSync(x);
    if (entries.length !== 1) throw new Error("unexpected tarball layout");
    moveDir(join(x, entries[0]), targetDir);
    return t.repo;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const TARBALL_URL = (repo) => `https://codeload.github.com/${repo}/tar.gz/refs/heads/main`;

function moveDir(src, dest) {
  // NOTE: dest must NOT pre-exist as a directory — mv into an existing dir nests the template.
  const parent = dest.slice(0, Math.max(dest.lastIndexOf("/"), dest.lastIndexOf("\\")));
  mkdirSync(parent, { recursive: true });
  let r;
  if (process.platform === "win32") {
    r = spawnSync("cmd", ["/c", "move", pathWin(src), pathWin(dest)], { stdio: "pipe" });
  } else {
    r = spawnSync("mv", [src, dest], { stdio: "pipe" });
  }
  if (r.status !== 0) {
    // fallback (cross-device move, etc.): copy contents, then clean up src
    mkdirSync(dest, { recursive: true });
    const cp = spawnSync("cp", ["-a", `${src}/.`, `${dest}/`], { stdio: "pipe" });
    if (cp.status !== 0) {
      throw new Error(`failed to move template into place: ${(cp.stderr || "").toString().slice(0, 160)}`);
    }
    rmSync(src, { recursive: true, force: true });
  }
}

function pathWin(p) {
  return p.replace(/\//g, "\\");
}