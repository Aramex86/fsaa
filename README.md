# FSAA — Feature-Sliced Atomic Architecture

**FSAA is FSD + Atomic Design with an answer to the question both leave open: *where does UI go?***

FSAA is not a new architecture theory. It is a practical, opinionated assembly of two proven methods — Feature-Sliced Design and Atomic Design — with the missing decision rules added. We do not claim a revolution.

> **Status:** Phase 0 (foundation). Used in production (internal tool) with real daily users. Public example app is coming.

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

Full runnable example: [`example/`](./example) *(coming in Phase 2)*

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
| 0 | Repo, honest README, CONTRIBUTING | **in progress** |
| 1 | Docs: import rules, criteria, anti-patterns | next |
| 2 | Boilerplate: Vite + React + TS, ESLint import enforcement, example app | — |
| 3 | Architecture import checker, CI | — |
| 4 | Promotion, adoption feedback loop | — |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Questions about a component's place in the structure are the most valuable contributions — open an issue with your case.

## License

MIT © Veaceslav Bezusco