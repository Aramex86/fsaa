/* fsaa/lib/generate.mjs — fsaa g <slice>: generate a canonical slice pair
   (entity + feature) inside an existing FSAA app, per agents/add-module.md:
   entity = index/types/api/slice + tests (flat); feature = index/ui/config +
   tests; thin route file; nothing else outside the layers. */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { entityFiles, featureFiles, pascal } from "./snippets.mjs";

export async function generateCmd({ args }) {
  const [raw] = args.filter((a) => !a.startsWith("--"));
  if (!raw) {
    console.error("fsaa g: missing slice name — usage: fsaa g <slice-name> (e.g. fsaa g checkout)");
    return 1;
  }
  const name = raw.toLowerCase();
  // no leading digit, no trailing dash, no double dash — each segment is a
  // valid identifier fragment so pascal()/camel() can never crash
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
    console.error(`fsaa g: invalid slice name "${raw}" — lowercase words/digits joined by single dashes (e.g. invoices-overview)`);
    return 1;
  }
  const Title = pascal(name);

  const cwd = resolve(process.cwd());
  const detected = detectTemplate(cwd);
  if (!detected) {
    console.error('fsaa g: run this inside an FSAA app (scaffolded by "fsaa init")');
    return 1;
  }
  const { template } = detected;

  const pagePath = template === "vite"
    ? join(cwd, "src", "pages", `${Title}Page.tsx`)
    : join(cwd, "app", name, "page.tsx");
  if (existsSync(pagePath)) {
    console.error(`fsaa g: page already exists: ${pagePath} — pick another slice name or remove the old page first`);
    return 1;
  }

  const featureDir = join(cwd, "src", "features", name);
  const entityDir = join(cwd, "src", "entities", name);
  if (existsSync(featureDir) || existsSync(entityDir)) {
    console.error(`fsaa g: slice already exists: src/features/${name} (and/or src/entities/${name})`);
    return 1;
  }

  writeTree(join(entityDir), entityFiles(name));
  writeTree(join(featureDir), featureFiles(name, template));

  if (template === "vite") {
    const routerPath = join(cwd, "src", "pages", "router.tsx");
    let router;
    try {
      router = readFileSync(routerPath, "utf8");
    } catch {
      router = null;
    }
    write(pagePath, vitePage(name, Title));
    if (router && !router.includes(`./${Title}Page`)) {
      if (router.includes(`<Route path="/${name}"`)) {
        console.log(`  (route /${name} already registered — router.tsx untouched)`);
      } else {
        const withRoute = addRoute(router, `<Route path="/${name}" element={<${Title}Page />} />`);
        if (withRoute) {
          writeFileSync(routerPath, addImport(withRoute, `import { ${Title}Page } from './${Title}Page';`));
        } else {
          console.error(`  (no </Routes> found in router.tsx — add the import+route by hand, see agents/add-module.md)`);
        }
      }
    }
  } else {
    write(join(cwd, "app", name, "page.tsx"), nextPage(name, Title));
  }

  console.log(`
  ✔ src/entities/${name}/  (index.ts, types.ts, api.ts, slice.ts, __tests__/)
  ✔ src/features/${name}/  (index.ts, ui/, config/, __tests__/)
  ✔ thin route registered${template === "next" ? " (app/" + name + "/page.tsx)" : " (src/pages/" + Title + "Page.tsx + router.tsx)"}

Verify (agents/add-module.md):
  pnpm lint · pnpm typecheck · pnpm test
  node scripts/check-agents-md.mjs`);
  return 0;
}

export function detectTemplate(cwd) {
  const marker = join(cwd, ".fsaa.json");
  if (existsSync(marker)) {
    try {
      const m = JSON.parse(readFileSync(marker, "utf8"));
      if (m.template === "vite" || m.template === "next") return { template: m.template };
    } catch {
      /* broken marker — fall through to file detection */
    }
  }
  for (const cfg of ["next.config.mjs", "next.config.js", "next.config.ts"]) {
    if (existsSync(join(cwd, cfg))) return { template: "next" };
  }
  if (existsSync(join(cwd, "vite.config.mjs")) || existsSync(join(cwd, "vite.config.ts"))) return { template: "vite" };
  return null;
}

function addImport(src, importLine) {
  const lines = src.split("\n");
  // insert after the last COMPLETE single-line import; multiline imports
  // ("import {", no "from") would break if we spliced inside them
  const lastImport = lines.reduce(
    (acc, l, i) => (l.trim().startsWith("import ") && l.includes("from") ? i : acc),
    -1,
  );
  if (lastImport === -1) return importLine + "\n" + src;
  lines.splice(lastImport + 1, 0, importLine);
  return lines.join("\n");
}

function addRoute(src, routeLine) {
  const lines = src.split("\n");
  const closeIdx = lines.findIndex((l) => l.includes("</Routes>"));
  if (closeIdx === -1) return null;
  // indent matches the sibling <Route> lines, not the closing tag
  const sibling = lines.find((l) => l.trim().startsWith("<Route "));
  const routeIndent = sibling ? (sibling.match(/^\s*/) || ["    "])[0] : "    ";
  lines.splice(closeIdx, 0, routeIndent + routeLine.trim());
  return lines.join("\n");
}

function writeTree(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const path = join(dir, rel);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
}

function write(path, content) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

export { vitePage, nextPage };

function vitePage(name, Title) {
  return `import { ${pascal(name)}Overview } from "@features/${name}";

/* Thin page composition (FSAA pages layer). */

export function ${Title}Page() {
  return <${pascal(name)}Overview />;
}
`;
}

function nextPage(name, Title) {
  return `import { ${pascal(name)}Overview } from '@features/${name}';

/* app/${name}/page.tsx — thin FSAA route. */

export default function ${Title}Page() {
  return <${pascal(name)}Overview />;
}
`;
}