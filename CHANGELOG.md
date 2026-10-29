# Changelog

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
