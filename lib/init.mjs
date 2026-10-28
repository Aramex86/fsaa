/* fsaa/lib/init.mjs — fsaa init: scaffold an app from an official FSAA starter. */
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fetchTemplate, TEMPLATES, templateLabel } from "./download.mjs";
import { prompt } from "./cli.mjs";

export async function initCmd({ flags, interactive }) {
  console.log("> FSAA init — Feature-Sliced Atomic Architecture\n");

  let name = flags.name;
  let template = flags.template;
  let manager = flags.manager;
  let target = flags.dir || ".";

  if (!name) name = await prompt("App name [my-app]: ", "my-app");
  if (!template) {
    const answer = await prompt("Template — 1) next (Next.js App Router)  2) vite (plain React) [next]: ", "next");
    template = answer.startsWith("2") ? "vite" : "next";
  }
  if (interactive && !manager) {
    console.log("  (package manager is part of the contract: pnpm — nothing to choose)");
  }

  name = name || "my-app";
  template = template || "next";
  manager = manager || "pnpm";

  validate(name, template, manager, flags);

  const dest = target === "." ? resolve(process.cwd(), name) : resolve(target);
  if (existsSync(dest) && !flags.force) {
    console.error(`fsaa: directory already exists: ${dest} (use --force to overwrite an empty dir)`);
    return 1;
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

  console.log("> installing dependencies (this may take a minute)…");
  const r = spawnSync("pnpm", ["install"], { cwd: dest, stdio: "inherit" });
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

  gitInit(dest, "feat/init");

  console.log(`\n${"=".repeat(52)}`);
  console.log(`  ✔ ${name} is ready (${templateLabel(template)})`);
  console.log(`  cd ${dest}`);
  console.log(`  ${manager} run dev`);
  console.log(`  agent contract: AGENTS.md · skills: agents/`);
  console.log(`  generate slices: ${manager === "pnpm" ? "pnpm exec" : "npx"} fsaa g <slice-name>`);
  console.log("=".repeat(52));
  return 0;
}

function validate(name, template, manager, flags) {
  if (!TEMPLATES[template]) {
    throw new Error(`unknown template "${template}" — choose: ${Object.keys(TEMPLATES).join(" | ")}`);
  }
  // The FSAA contract pins pnpm (single-lockfile rule + packageManager field).
  // npm installs create a second lockfile and make the drift-check red by design.
  if (manager && manager !== "pnpm") {
    throw new Error(`manager "${manager}" is not the contract manager — FSAA pins pnpm (enable it: corepack enable pnpm, or npm i -g pnpm)`);
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) {
    throw new Error(`invalid app name "${name}" — letters, digits, dot, dash, underscore only`);
  }
}

function stamp(dest, { template }) {
  writeFileSync(join(dest, ".fsaa.json"), JSON.stringify({ fsaa: "0.1.0", template, generatedAt: new Date().toISOString() }, null, 2) + "\n");
}

function gitInit(dest, branch) {
  const run = (args) => spawnSync("git", args, { cwd: dest, stdio: "pipe" });
  if (!existsSync(join(dest, ".git"))) {
    run(["init", "-b", branch]);
    run(["add", "-A"]);
    const c = run(["commit", "-q", "-m", `feat/init — scaffold ${nameSafe(dest)} from FSAA starter`]);
    if (c.status !== 0) console.error("  (git init skipped — git unavailable or identity unset; files are ready)");
  }
}

function nameSafe(dest) {
  return dest.split(/[/\\]/).filter(Boolean).pop() || "app";
}