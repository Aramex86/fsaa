/* fsaa/lib/generate.mjs — fsaa g: canonical generators inside an existing
   FSAA app, per agents/add-module.md and the fsaa canon:

     fsaa g <slice>            legacy pair: full entity + full feature + thin route
     fsaa g entity <noun>      entity only (index/types/api/slice/__tests__)
     fsaa g feature <name>     feature only (index/ui/config/__tests__)
     fsaa g atom <Name>        shared/ui/atoms/<Name>.tsx (stateless primitive)
     fsaa g molecule <Name>    shared/ui/molecules/<Name>/ (+ graduation hint)
     fsaa g page <name> [route]  thin page (+ router registration on vite)

   Names: entity/feature/page are kebab-case; atom/molecule are PascalCase.
   All snippets live in snippets.mjs — one source of truth. */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { entityFiles, featureFiles, atomFile, moleculeFiles, pascal } from "./snippets.mjs";

const KINDS = ["entity", "feature", "atom", "molecule", "page"];

const USAGE = `fsaa g — canonical generators (run inside an FSAA app):
  fsaa g <slice-name>          # pair: entity + feature + thin route (e.g. fsaa g checkout)
  fsaa g entity <noun>         # entity only: src/entities/<noun>/{index,types,api,slice,__tests__}
  fsaa g feature <name>        # feature only: src/features/<name>/{index,ui,config,__tests__}
  fsaa g atom <Name>           # src/shared/ui/atoms/<Name>.tsx (stateless primitive)
  fsaa g molecule <Name>       # src/shared/ui/molecules/<Name>/ (+ graduation hint)
  fsaa g page <name> [route]   # thin page; route defaults to the name`;

export async function generateCmd({ args }) {
  const [first] = args.filter((a) => !a.startsWith("--"));
  if (!first) {
    console.error(USAGE);
    return 1;
  }
  const positional = args.filter((a) => !a.startsWith("--"));
  if ((KINDS).includes(first)) {
    const [, ...rest] = positional;
    if (!rest.length || !rest[0]) {
      console.error(`fsaa g: missing name — ${USAGE}`);
      return 1;
    }
    const cwd = resolve(process.cwd());
    const detected = detectTemplate(cwd);
    if (!detected) {
      console.error('fsaa g: run this inside an FSAA app (scaffolded by "fsaa init")');
      return 1;
    }
    const { template } = detected;
    const name = rest[0];
    const route = rest[1];
    if (first === "entity") return genEntity(cwd, name);
    if (first === "feature") return genFeature(cwd, name, template);
    if (first === "atom") return genAtom(cwd, name);
    if (first === "molecule") return genMolecule(cwd, name);
    if (first === "page") return genPage(cwd, name, route, template);
  }
  // legacy: fsaa g <slice> = pair (entity + feature + route)
  return genPair(positional[0]);
}

/* ---------- shared validation ---------- */

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const PASCAL_NAME = /^[A-Z][A-Za-z0-9]*$/;

function fail(msg) {
  console.error(msg);
  return 1;
}
const verify = () =>
  `\nVerify (agents/add-module.md):\n  pnpm lint · pnpm typecheck · pnpm test\n  node scripts/check-agents-md.mjs`;

/* ---------- generators ---------- */

function genEntity(cwd, raw) {
  const name = raw.toLowerCase();
  if (!KEBAB.test(name))
    return fail(`fsaa g: invalid entity name "${raw}" — lowercase words/digits, single dashes (e.g. invoices-overview)`);
  const dir = join(cwd, "src", "entities", name);
  if (existsSync(dir))
    return fail(`fsaa g: entity already exists: src/entities/${name}`);
  writeTree(dir, entityFiles(name));
  console.log(`  ✔ src/entities/${name}/  (index.ts, types.ts, api.ts, slice.ts, __tests__/)${verify()}`);
  return 0;
}

function genFeature(cwd, raw, template) {
  const name = raw.toLowerCase();
  if (!KEBAB.test(name))
    return fail(`fsaa g: invalid feature name "${raw}" — lowercase words/digits, single dashes (e.g. invoices-overview)`);
  const dir = join(cwd, "src", "features", name);
  if (existsSync(dir))
    return fail(`fsaa g: feature already exists: src/features/${name}`);
  writeTree(dir, featureFiles(name, template));
  console.log(`  ✔ src/features/${name}/  (index.ts, ui/, config/, __tests__/)${verify()}`);
  return 0;
}

function genAtom(cwd, raw) {
  const Name = raw;
  if (!PASCAL_NAME.test(Name))
    return fail(`fsaa g: invalid atom name "${raw}" — PascalCase, no dashes (e.g. BadgeButton)`);
  const path = join(cwd, "src", "shared", "ui", "atoms", `${Name}.tsx`);
  if (existsSync(path))
    return fail(`fsaa g: atom already exists: src/shared/ui/atoms/${Name}.tsx`);
  write(path, atomFile(Name));
  console.log(`  ✔ src/shared/ui/atoms/${Name}.tsx  (stateless primitive)${verify()}`);
  return 0;
}

function genMolecule(cwd, raw) {
  const Name = raw;
  if (!PASCAL_NAME.test(Name))
    return fail(`fsaa g: invalid molecule name "${raw}" — PascalCase, no dashes (e.g. ConfirmDelete)`);
  const dir = join(cwd, "src", "shared", "ui", "molecules", Name);
  if (existsSync(dir))
    return fail(`fsaa g: molecule already exists: src/shared/ui/molecules/${Name}/`);
  writeTree(dir, moleculeFiles(Name));
  console.log(`  ✔ src/shared/ui/molecules/${Name}/  (index.ts, ${Name}.tsx, __tests__/)`);
  console.log(`  ↪ graduation hint: shared earns its place on the SECOND confirmed duplication —
     the first duplicate stays feature-local (see the graduation section of the docs).${verify()}`);
  return 0;
}

function genPage(cwd, raw, route, template) {
  const name = raw.toLowerCase();
  if (!KEBAB.test(name))
    return fail(`fsaa g: invalid page name "${raw}" — lowercase words/digits, single dashes (e.g. checkout-report)`);
  const use = route || name;
  const Title = pascal(use);
  const pagePath =
    template === "vite"
      ? join(cwd, "src", "pages", `${Title}Page.tsx`)
      : join(cwd, "app", name, "page.tsx");
  if (existsSync(pagePath))
    return fail(`fsaa g: page already exists: ${pagePath}`);
  const routePath = template === "vite" ? join(cwd, "src", "pages", "router.tsx") : null;

  // the feature side must exist — pages compose features, never live alone
  const featureIndex = join(cwd, "src", "features", use, "index.ts");
  if (!existsSync(featureIndex))
    return fail(
      `fsaa g: no feature to compose — generate one first: fsaa g feature ${use} (pages compose features, per ui-location)`,
    );

  if (template === "vite") {
    write(pagePath, vitePage(use, pascal(use)));
    let router = null;
    try {
      router = readFileSync(routePath, "utf8");
    } catch {
      router = null;
    }
    if (router && !router.includes(`./${Title}Page`)) {
      if (router.includes(`<Route path="/${name}"`)) {
        console.log(`  (route /${name} already registered — router.tsx untouched)`);
      } else {
        const withRoute = addRoute(router, `<Route path="/${name}" element={<${Title}Page />} />`);
        if (withRoute) {
          writeFileSync(routePath, addImport(withRoute, `import { ${Title}Page } from './${Title}Page';`));
        } else {
          console.error(`  (no </Routes> found in router.tsx — add the import+route by hand, see agents/add-module.md)`);
        }
      }
    }
  } else {
    write(pagePath, nextPage(use, pascal(use)));
  }
  console.log(
    `  ✔ thin page: ${pagePath.replace(cwd, ".").replace(/^[./]+/, "./")} (composes @features/${use})${verify()}`,
  );
  return 0;
}

/* legacy pair: fsaa g <slice> — entity + feature + thin route */
function genPair(raw) {
  const name = raw.toLowerCase();
  // no leading digit, no trailing dash, no double dash — each segment is a
  // valid identifier fragment so pascal()/camel() can never crash
  if (!KEBAB.test(name)) {
    console.error(`fsaa g: invalid slice name "${raw}" — lowercase words/digits joined by single dashes (e.g. invoices-overview)`);
    return 1;
  }
  const cwd = resolve(process.cwd());
  const detected = detectTemplate(cwd);
  if (!detected) {
    console.error('fsaa g: run this inside an FSAA app (scaffolded by "fsaa init")');
    return 1;
  }
  const { template } = detected;

  const pagePath = template === "vite"
    ? join(cwd, "src", "pages", `${pascal(name)}Page.tsx`)
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
    write(pagePath, vitePage(name, pascal(name)));
    if (router && !router.includes(`./${pascal(name)}Page`)) {
      if (router.includes(`<Route path="/${name}"`)) {
        console.log(`  (route /${name} already registered — router.tsx untouched)`);
      } else {
        const withRoute = addRoute(router, `<Route path="/${name}" element={<${pascal(name)}Page />} />`);
        if (withRoute) {
          writeFileSync(routerPath, addImport(withRoute, `import { ${pascal(name)}Page } from './${pascal(name)}Page';`));
        } else {
          console.error(`  (no </Routes> found in router.tsx — add the import+route by hand, see agents/add-module.md)`);
        }
      }
    }
  } else {
    write(join(cwd, "app", name, "page.tsx"), nextPage(name, pascal(name)));
  }

  console.log(`
  ✔ src/entities/${name}/  (index.ts, types.ts, api.ts, slice.ts, __tests__/)
  ✔ src/features/${name}/  (index.ts, ui/, config/, __tests__/)
  ✔ thin route registered${template === "next" ? " (app/" + name + "/page.tsx)" : " (src/pages/" + pascal(name) + "Page.tsx + router.tsx)"}
${verify()}`);
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