<img width="814" height="243" alt="image" src="https://github.com/user-attachments/assets/047ea0c4-ae54-43f1-9dd9-2a8805839ed0" />

# FSAA — Feature-Sliced Atomic Architecture ⚡

> **FSD + Atomic Design with the missing decision rules: *where does UI go?***

[![templates](https://img.shields.io/badge/templates-fsaa--react%20·%20fsaa--vite-43e0bd)](https://aramex86.github.io/fsaa/)
[![docs](https://img.shields.io/badge/docs-aramex86.github.io%2Ffsaa-7ab8ff)](https://aramex86.github.io/fsaa/)
![license](https://img.shields.io/badge/license-MIT-b79bff)
![methodology](https://img.shields.io/badge/status-v0.3%20draft-ffcf6b)

* 💡 **Three decision rules** — graduation, boundary test, organisms eliminated
* 🔒 **ESLint-enforced boundaries** — wrong imports fail lint, not code review
* 🧩 **Two templates** — Next.js App Router · plain React (Vite + react-router)
* 🤖 **Agentic by default** — AGENTS.md contract with CI drift-check, step-by-step agent procedures, navigation skill for external agents
* 🚀 **Self-demonstrating** — the docs site is itself built on FSAA
* 🏭 **Production-proven** — internal financial tool, real daily users
* 📖 **Inspectable without NDA** — open code, open docs, open issues

<div align="center">

**[Read the docs →](https://aramex86.github.io/fsaa/)** · **[Next.js template →](https://github.com/Aramex86/fsaa-next)** · **[Plain React template →](https://github.com/Aramex86/fsaa-vite)**

</div>

FSAA is not a new architecture theory. It is a practical, opinionated assembly of two proven methods — Feature-Sliced Design and Atomic Design — with the missing decision rules added. We do not claim a revolution.

## Status

> **Phase 0–2 (done):** methodology frozen, docs site live and indexed, starter templates shipped — [fsaa-next](https://github.com/Aramex86/fsaa-next) (Next.js App Router) and [fsaa-vite](https://github.com/Aramex86/fsaa-vite) (plain React) with **ESLint-enforced layer boundaries**: wrong imports fail lint, not code review. **Phase 3 (in progress):** the agentic machine — an [AGENTS.md contract](https://github.com/Aramex86/fsaa-next/blob/main/AGENTS.md) where every rule carries a CI check marker, a **drift-check** that fails the build when docs and code drift apart, `agents/` step-by-step procedures, and [`where-ui-goes`](https://github.com/Aramex86/fsaa-next/blob/main/agents/where-ui-goes.md) — a navigation skill for external agents ([how it works →](https://aramex86.github.io/fsaa/agentic/)).

Used in production (internal tool) with real daily users — and **self-demonstrating**: this documentation site is itself built on FSAA (features/entities/shared, thin routes), so the architecture is inspectable without NDA. Both templates clone the same structure with working Projects/Orders examples. Public example app — Phase 2.

## The problem

Every frontend developer on a medium+ project hits the same wall: **"where do I put this component?"**

- Feature-Sliced Design (FSD) answers *where does code live and how does it access business logic* — but is silent on UI composition, and its `widgets` layer is controversial.
- Atomic Design answers *how does a component look and compose* (atoms → molecules → organisms) — but says nothing about business logic, and `organisms/` folders tend to become dumping grounds.
- Bulletproof React is a set of good advice, not an architecture — nothing enforces boundaries.

FSAA combines them additively and adds the three missing decision rules.

## The layer stack

Imports flow **only downward**, with **no layer skipping** and **no circular dependencies**. Every module exposes a public API via `index.ts`.

| Layer | Responsibility | Can import from |
|---|---|---|
| `app` | Router, providers, global config, initialization | `shared` only |
| `pages` | Route-level compositions | `features`, `shared` |
| `features` | User scenarios **and** large page-level blocks | `entities`, `shared` |
| `entities` | Business models + data access | `shared` |
| `shared` | Design tokens, generic UI primitives, utilities | external libs only |

There is deliberately **no `widgets` layer** — features double as page-level blocks. One decision less per component.

### FSAA & Next.js App Router

Next.js names collide with FSAA layers: its `app/` folder holds routes and `pages/` is the Pages Router. Renaming layers to `_app`/`_pages` (the standard FSD workaround) is not needed in FSAA. Instead, **the `pages` layer is replaced by the App Router itself** — route files are the page compositions:

```
src/
  features/    # user scenarios incl. large page-level blocks
  entities/    # business models + data access
  shared/      # tokens, atoms/molecules, utilities
app/
  dashboard/page.tsx    # thin: import DashboardOverview, render, wrap in <Suspense>
  orders/page.tsx       # thin: import OrdersOverview, render, wrap in <Suspense>
```

A thin route file (import → render → Suspense) **is** the page composition — no `_app`/`_pages` prefixes, no lint conflict. Everything else works unchanged: the three decision rules and the layer stack above.

## Three decision rules (the actual value)

### 1. The Graduation pattern

Feature-local UI lives **flat** in `features/<name>/ui/` — 5–10 components, no Atomic Design inside a feature, the scope is already narrow. When a component proves reusable **in another feature**, it graduates: promoted to `shared/ui` and reorganized into atoms/molecules.

Features own their UI until it earns sharing.

**Mechanics.** The trigger is objective — a component is needed by a *second independent feature*. The first duplicate is legal: one copy is a signal, not a catastrophe. Promotion = **one PR**: the component moves to `shared/ui/molecules/`, both features import it from the shared public API (`index.ts`), and the feature-local copies are deleted inside that same changeset. Cross-feature imports are a lint error, so a copy-pasted component fails CI — drift cannot hide, the only legal cross-feature sources are entities (data) and shared (UI). (The starter templates ship this enforcement — see Phase 2 in the roadmap.)

### 2. The boundary test for `shared`

> *If I removed this component from the app entirely, could it still be described without mentioning users, orders, or projects?*

Yes → `shared`. No → feature. A generic `DataTable` passes this test; `projectColumns` does not.

### 3. Organisms are eliminated

A large composition — what Atomic Design would call an organism — **is a feature**. The Presentational/Container split happens at the export level (one file may export both `UserListContainer` and `UserList`), not the filesystem level.

## Atomic Design placement

Atomic levels live **inside `shared/ui` only**:

| Level | Location | Examples |
|---|---|---|
| Atoms | `shared/ui/atoms` | `Button`, `Input`, `TableCell` |
| Molecules | `shared/ui/molecules` | `DataTable`, `FormRow`, `SearchField` |

## Canonical example: one table, two entities

```
src/
  shared/ui/atoms/TableCell.tsx
  shared/ui/atoms/TableHeaderCell.tsx
  shared/ui/molecules/table/DataTable.tsx      # generic: columns, data, isLoading
  entities/project/                            # project data access + types
  entities/order/                              # order data access + types
  features/projects-overview/
    config/projectColumns.tsx                  # columns from shared atoms + feature actions
    ui/ProjectsOverview.tsx                    # wires useProjects + projectColumns + DataTable
  features/orders-overview/
    config/orderColumns.tsx
    ui/OrdersOverview.tsx
  pages/ProjectsPage.tsx                       # renders ProjectsOverview
  pages/OrdersPage.tsx                         # renders OrdersOverview
```

**The rule:** the table stays generic; business-specific columns live in their features. If two entities need the same visual pattern, extract the pattern into `shared` — keep the entity-specific configuration in `features`.

**Runnable code:** this exact structure ships in the starter templates — [fsaa-next (Next.js App Router)](https://github.com/Aramex86/fsaa-next) and [fsaa-vite (plain React SPA)](https://github.com/Aramex86/fsaa-vite), both with the Projects/Orders example working (`npm run dev` → `/projects`, `/orders`). A step-by-step trace lives in the [docs' worked example](https://aramex86.github.io/fsaa/example/).

## Comparison

| Method | What it answers | What it misses |
|---|---|---|
| **FSAA** | Where UI goes + where code lives + how UI composes | — (this is the assembly) |
| FSD | Where code lives, import boundaries | Where UI goes; `widgets` is controversial; high entry threshold |
| Atomic Design | How components look and compose | Nothing about business logic; `organisms/` becomes a dumping ground |
| Bulletproof React | Good defaults per concern | No enforced boundaries — not an architecture |

**"Isn't this just FSD + Atomic Design?"** — Yes, deliberately. The value is not novelty; it is the three decision rules neither method provides: graduation, the boundary test, no organisms.

## When to use it

**Good fit:** medium+ projects, teams of 3+, long-lived products, design-system-driven UI.

**Not a fit:** throwaway prototypes, MVPs with a 2-week lifespan, tiny apps where folder structure is not the bottleneck.

## Roadmap

| Phase | Focus | Status |
|---|---|---|
| 0 | Repo, honest README, CONTRIBUTING | ✅ done (this repo) |
| 1 | Docs site (indexable: OG, sitemap, GSC) | ✅ [aramex86.github.io/fsaa](https://aramex86.github.io/fsaa/) |
| 2 | Boilerplate — two templates: [Next.js App Router](https://github.com/Aramex86/fsaa-next) + [plain React (Vite)](https://github.com/Aramex86/fsaa-vite), ESLint-enforced boundaries, Projects/Orders example | ✅ done |
| 3 | Agentic layer — AGENTS.md contract, CI drift-check, `agents/` procedures, external-agent skill | ✅ done ([docs](https://aramex86.github.io/fsaa/agentic/)) |
| 4 | CLI — `npx fsaa init` (asks next/vite) + slice generator | 🚧 in progress |
| 5 | Promotion, adoption feedback loop | — |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Questions about a component's place in the structure are the most valuable contributions — open an issue with your case.

## License

MIT © Veaceslav Bezusco
