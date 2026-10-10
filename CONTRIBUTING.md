# Contributing to FSAA

Thanks for your interest — and read this first, because FSAA is **opinionated on purpose**. Most contributions will be reviewed against the three decision rules below.

## The most valuable contribution

**A real placement question.** "I have `X` — shared or feature?" Open an issue with:
1. what the component does,
2. who uses it (which features),
3. your boundary-test answer.

Hard cases that survive the boundary test discussion become documentation — credited to you.

## The three rules every PR is checked against

1. **Graduation:** UI lives flat in `features/<name>/ui/` first. Promote to `shared/ui` only when a second feature actually needs it. PRs that prematurely promote UI into shared will be sent back.
2. **Boundary test:** a component belongs in `shared` only if it can be described without mentioning users, orders, projects — any business noun. A generic `DataTable` passes; `projectColumns` does not.
3. **No organisms:** large compositions are features, not `shared/ui/organisms/*`. Presentational/Container splitting happens at the export level, not the filesystem level.

## Repo rules

- Imports flow downward only; no layer skipping (`pages` cannot import `entities` directly); no circular dependencies; public API via `index.ts`.
- The `widgets` layer **does not exist** in FSAA — PRs introducing one will be declined (discussed in issues first).
- Every feature folder: `api/`, `model/`, `ui/`, optional `config/`.

## For code contributions (Phase 2+)

- Vite + React + TypeScript strict mode.
- Types on props — the series' audience is TypeScript-first; no `any` in examples.
- Tests for anything in `shared/`.
- Run `pnpm lint && pnpm test` before committing (CI enforces it once Phase 3 lands).

## For docs contributions

- English only.
- Dense tables over prose; every rule gets an example.
- Keep the honest framing: FSAA is an assembly, not a new theory. Claims of novelty will be edited out.

## Issue vs PR

Placement questions, boundary-test edge cases, adoption stories → **issues**. Documentation fixes, example code → **PRs**.

## License

By contributing you agree that your contributions are licensed under MIT.