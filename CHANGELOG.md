# Changelog

## 0.2.6

- **Windows: npx fallback now actually runs when pnpm is missing.** `spawnSync("pnpm.cmd", ..., { shell: true })` never sets `r.error` when the command is absent: cmd.exe prints `'pnpm.cmd' is not recognized` and exits 1. `init` treated that as a failed install and skipped the pinned-pnpm-through-npx fallback. Now `pnpm --version` is probed first; if it fails, the fallback runs. (fix: lib/init.mjs)
- **Names are normalized ALWAYS, not only when the lowercase gate fails.** The gate `^[a-z0-9][a-z0-9._-]*$` skipped two names that still should not reach validation raw: trailing `"-"`/`"."` (e.g. `my-app-` passed the gate, then failed the trailing-char check — when the normalizer would produce `my-app`), and underscore names (`pay_on` stayed `pay_on` instead of becoming kebab-case `pay-on` — npm allows `_`, but the scaffold folder should be predictable). `normalizeName()` is now unconditional: it is idempotent on already-valid names, so only the broken inputs change. Still intentionally out of scope: intermediate dots (`my.app` stays `my.app` — valid npm name). (fix: lib/init.mjs)
- package.json version was bumped to 0.2.5 for the pnpm probe fix at publish time only; repo now moves to 0.2.6.

## 0.2.4 — 2026-11-20

- **App names normalize instead of stack-tracing** (first adopter report): `npm create fsaa` with `PayOn` crashed with "unexpected error" + a stack trace, because `validate()` threw plain `Error`s the bin didn't recognize as user errors. Now: sloppy names are normalized before validation (`PayOn` -> `pay-on`, `My App` -> `my-app`, `MyApp.` -> `my-app`) with a visible notice, and every remaining validation failure ("???", reserved Windows names, unknown template) exits with a clean one-line `fsaa: ...` message - "wrong answers" are made impossible, not rejected with a trace. (fix: lib/init.mjs)


## 0.2.3 — 2026-11-10

- Post-scaffold banner now says dependencies ARE installed and answers the "pnpm not recognized" wall: `corepack enable` (one-time, nothing to install globally) or `npx -y <pinned pnpm>` per command. Fallback paths on missing-npx also point at corepack. First real adopter hit this exact gap. No logic changes.

## 0.2.2 — 2026-11-10

- npm-page confusion fix: README now leads with **`npm create fsaa@latest`** and an explicit warning that `npm i create-fsaa` only installs the CLI (first real adopter hit exactly this). No code changes.

## 0.2.0 — 2026-10-29

- **`fsaa g` — five canonical generators** (was: one pair command):
  - `fsaa g <slice>` — unchanged pair (entity + feature + thin route), backward compatible
  - `fsaa g entity <noun>` — entity only (index/types/api/slice/__tests__, flat canon)
  - `fsaa g feature <name>` — feature only (index/ui/config/__tests__)
  - `fsaa g atom <Name>` — shared/ui/atoms/<Name>.tsx, stateless primitive
  - `fsaa g molecule <Name>` — shared/ui/molecules/<Name>/ (+ the graduation hint printed)
  - `fsaa g page <name> [route]` — thin page composing an EXISTING feature (refuses to scaffold an orphan page)
- Naming validation per canon: entity/feature/page = kebab-case; atom/molecule = PascalCase; helpful errors on duplicates and mismatches.
- All snippets still live in `lib/snippets.mjs` (single source of truth).
- Verified: end-to-end on fresh next + vite scaffolds — generated code passes test · typecheck · lint · drift-check (12 rules); negative battery 8/8 (bad names, duplicates, page-without-feature, missing-args) exit 1 with actionable messages.

## 0.1.7 — 2026-10-28

- Windows EPERM on rename self-heals via copy.
