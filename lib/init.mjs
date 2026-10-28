/* fsaa/lib/init.mjs — fsaa init: scaffold an app from an official FSAA starter. */
import { existsSync, readFileSync, writeFileSync, rmSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fetchTemplate, TEMPLATES, templateLabel } from "./download.mjs";
import { prompt } from "./cli.mjs";

export async function initCmd({ flags, interactive }) {
  console.log("> FSAA init — Feature-Sliced Atomic Architecture\n");

  let name = flags.name;
  let template = flags.template;

  if (!name) name = await prompt("App name [my-app]: ", "my-app");
  if (!template) {
    const answer = await prompt("Template — 1) next (Next.js App Router)  2) vite (plain React) [next]: ", "next");
    template = answer.startsWith("2") ? "vite" : "next";
  }

  name = name || "my-app";
  template = template || "next";
  const manager = "pnpm"; // contract pin (single-lockfile rule lives on pnpm)

  if (typeof flags.dir !== "undefined" && typeof flags.dir !== "string") {
    throw new Error("--dir needs a value: fsaa init --dir ./somewhere");
  }
  validate(name, template);

  const dest = resolve(flags.dir || ".", name);
  if (existsSync(dest)) {
    if (!flags.force) {
      console.error(`fsaa: directory already exists: ${dest} (add --force to use an EMPTY directory; non-existing is preferred)`);
      return 1;
    }
    if (!statSync(dest).isDirectory()) {
      console.error(`fsaa: --force target is not a directory: ${dest}`);
      return 1;
    }
    const left = readdirSync(dest).filter((e) => e !== ".git" && e !== ".gitignore");
    if (left.length > 0) {
      console.error(`fsaa: refusing --force: directory is not empty: ${dest} (${left.length} items) — move away or delete them yourself`);
      return 1;
    }
    rmSync(dest, { recursive: true });
  }

  console.log(`  template: ${templateLabel(template)}`);
  console.log(`  manager:  pnpm (contract)`);
  console.log(`  target:   ${dest}\n`);

  console.log("> downloading template (codeload tarball)…");
  await fetchTemplate(template, dest);
  stamp(dest, { template });

  console.log("> renaming project…");
  const pkgPath = join(dest, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  // Windows: pnpm ships as pnpm.cmd; spawning a bare "pnpm" on win32 fails
  // (Node ≥18.20 refuses .cmd/.bat without shell). Use the .cmd shim there.
  const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  console.log("> installing dependencies (this may take a minute)…");
  const r = spawnSync(pnpmBin, ["install"], { cwd: dest, stdio: "inherit" });
  if (r.error) {
    console.error('\nfsaa: pnpm not found on PATH — the FSAA contract pins pnpm.');
    console.error('  enable it:  corepack enable pnpm    or:  npm i -g pnpm');
    return 1;
  }
  if (r.status !== 0) {
    console.error("fsaa: dependency install failed — the template files are in place; fix your PATH or run install manually.");
    return 1;
  }
  // single-lockfile contract: the template ships pnpm-lock.yaml — an npm install
  // adds package-lock.json next to it, which makes drift-check red. Keep exactly one.
  const otherLock = join(dest, "package-lock.json");
  if (existsSync(otherLock)) rmSync(otherLock);

  console.log("\n> running the contract drift-check as proof…");
  const dc = spawnSync("node", ["scripts/check-agents-md.mjs"], { cwd: dest, stdio: "inherit" });
  if (dc.status !== 0) {
    console.error("fsaa: drift-check is red after init — report this: https://github.com/Aramex86/fsaa/issues");
    return 1;
  }

  gitInit(dest, "feat/init", nameSafe(dest));

  console.log(`\n${"=".repeat(52)}`);
  console.log(`  ✔ ${name} is ready (${templateLabel(template)})`);
  console.log(`  cd ${dest}`);
  console.log(`  ${manager} run dev`);
  console.log(`  agent contract: AGENTS.md · skills: agents/`);
  console.log(`  generate slices: ${manager === "pnpm" ? "pnpm exec" : "npx"} fsaa g <slice-name> (or: npx create-fsaa g <slice-name>)`);
  console.log("=".repeat(52));
  return 0;
}

function validate(name, template) {
  if (!TEMPLATES[template]) {
    throw new Error(`unknown template "${template}" — choose: ${Object.keys(TEMPLATES).join(" | ")}`);
  }
  // npm/pnpm require lowercase package names; a strict lowercase regex also
  // keeps the project folder name predictable (no /i flag deliberately).
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    throw new Error(`invalid app name "${name}" — lowercase letters, digits, dots, dashes, underscores only`);
  }
  // Windows: trailing dots/space vanish in paths; reserved device names break mkdir.
  if (/[.\s-]$/.test(name) || /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(name)) {
    throw new Error(`invalid app name "${name}" — no trailing dot/space/dash, and no Windows reserved names (con, prn, aux, nul, com1..9, lpt1..9)`);
  }
}

function stamp(dest, { template }) {
  writeFileSync(join(dest, ".fsaa.json"), JSON.stringify({ fsaa: "0.1.0", template, generatedAt: new Date().toISOString() }, null, 2) + "\n");
}

function gitInit(dest, branch, appName) {
  const state = (args) => spawnSync("git", args, { cwd: dest, stdio: "pipe" });
  if (!existsSync(join(dest, ".git"))) {
    state(["init", "-b", branch]);
    state(["add", "-A"]);
    const c = state(["commit", "-q", "-m", `feat/init — scaffold ${appName} from FSAA starter`]);
    if (c.status !== 0) {
      console.error("  (git repo initialized but the commit needs identity — set git config user.name/user.email and commit)");
    }
  }
}

function nameSafe(dest) {
  return dest.split(/[/\\]/).filter(Boolean).pop() || "app";
}