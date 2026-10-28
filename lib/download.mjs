/* fsaa/lib/download.mjs — degit-style fetch of a template repo tarball (zero deps).
   Downloads the codeload tar.gz, extracts with the system `tar` (ships with
   Linux, macOS, Windows 10+), then moves the tarball's root folder to the target dir. */
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, rmSync, renameSync, cpSync, existsSync, readFileSync, statSync } from "node:fs";
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
    const entries = readdirSync(x).filter((e) => e !== "pax_global_header");
    if (entries.length !== 1) throw new Error("unexpected tarball layout");
    const root = join(x, entries[0]);
    if (!statSync(root).isDirectory()) throw new Error("tarball root is not a directory");
    moveDir(root, targetDir);
    return t.repo;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const TARBALL_URL = (repo) => `https://codeload.github.com/${repo}/tar.gz/refs/heads/main`;

function moveDir(src, dest) {
  // dest must not exist as a directory: rename would nest (same for `mv`, `move`, and cp fallback).
  // Callers guarantee a non-existent dest (init/generate check first).
  if (existsSync(dest)) {
    throw new Error(
      `destination already exists: ${dest}\n` +
      `  (safeguard: refuse to overwrite; run fsaa in an empty or non-existent directory)`,
    );
  }
  // fs-only move: rename first, cpSync fallback for anything Windows throws at
  // a freshly-extracted dir on rename (EXDEV cross-device, EPERM/EBUSY from an
  // antivirus/indexing scan holding a handle). Copy-then-cleanup self-heals all.
  try {
    renameSync(src, dest);
    return;
  } catch (err) {
    if (!["EXDEV", "EPERM", "EACCES", "EBUSY", "ENOTEMPTY", "EISDIR"].includes(err?.code)) throw err;
  }
  cpSync(src, dest, { recursive: true });
  rmSync(src, { recursive: true, force: true });
}