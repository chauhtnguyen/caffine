# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Custom development setup (caffine fork)

This repo is a fork of [AFFiNE](https://github.com/toeverything/AFFiNE). Custom work lives on the **caffine** branch.

- **Remotes:** `origin` = this fork (chauhtnguyen/caffine); `upstream` = toeverything/AFFiNE.
- **Workflow:** Develop on **caffine**. Periodically pull latest AFFiNE: `git fetch upstream && git merge upstream/canary` (or `git rebase upstream/canary`).
- **Prefer:** New files and extension points (e.g. new plugins/providers under `packages/backend/server/src/plugins/`) to reduce merge conflicts. See `docs/CUSTOM-DEVELOPMENT.md` for full details.
- **Custom work examples:** Ollama AI provider (`plugins/copilot/providers/ollama.ts`), Docker external-Postgres compose files (`.docker/selfhost/`).

## Project Overview

AFFiNE is an open-source, all-in-one workspace combining documentation, whiteboarding, and real-time collaboration with a local-first architecture. It features both page and edgeless (canvas) modes with AI-powered capabilities.

## Architecture

### Monorepo Structure

- **packages/backend/server/**: NestJS server with GraphQL API, Prisma ORM, flavor-based module loading
- **packages/frontend/core/**: Main React app with custom DI framework, 65+ feature modules
- **packages/frontend/component/**: Shared UI component library
- **packages/frontend/apps/**: Platform-specific apps (web, electron, mobile)
- **packages/common/infra/**: Custom DI/IoC framework (`@toeverything/infra`), LiveData reactive state
- **blocksuite/**: Custom collaborative editor framework (LitElement + Y.js CRDTs)
- **tools/cli/**: Custom `yarn affine` CLI (Clipanion-based)
- **tests/**: E2E test suites (Playwright) organized by platform

### Tech Stack

- **Frontend**: React 19, TypeScript, Jotai (atoms), Vanilla Extract (`.css.ts` styling)
- **Backend**: NestJS, Prisma, GraphQL, PostgreSQL, Redis
- **Editor**: BlockSuite (LitElement web components + Y.js CRDTs)
- **Native**: Rust with NAPI-RS
- **Mobile**: Capacitor | **Desktop**: Electron
- **Package Manager**: Yarn 4 (node-modules linker) | **Build**: Vite 7
- **Testing**: Vitest (unit) + Playwright (E2E)

## Essential Commands

```bash
# Setup
yarn install                # Install deps (runs postinstall: yarn affine init && yarn husky)

# Development
yarn dev                              # Web dev server
yarn workspace @affine/server dev     # Backend only
yarn workspace @affine/electron dev   # Desktop (Electron)

# Building
yarn build                            # Build all packages
yarn workspace @affine/web build      # Web app only
yarn workspace @affine/server build   # Backend only
yarn affine bundle                    # Bundle for distribution
yarn affine clean                     # Clean build artifacts

# Code quality
yarn lint                  # ESLint + Prettier
yarn lint:fix              # Auto-fix lint issues
yarn typecheck             # TypeScript type checking (tsc -b)

# Unit tests (Vitest)
yarn test                  # All unit tests
yarn test:coverage         # With coverage
vitest run path/to/file.spec.ts       # Single test file
vitest run --testPathPattern="some-pattern"  # Pattern matching

# E2E tests (Playwright)
yarn workspace @affine-test/affine-local e2e     # Local E2E
yarn workspace @affine-test/affine-cloud e2e     # Cloud E2E
yarn workspace @affine-test/affine-desktop e2e   # Desktop E2E

# Database (Prisma)
yarn workspace @affine/server prisma generate    # Generate client
yarn workspace @affine/server prisma migrate dev # Run migrations
yarn workspace @affine/server prisma studio      # GUI browser
```

## Key Architectural Patterns

### Backend: Flavor-Based Module Loading

The backend uses `AppModuleBuilder` in `app.module.ts` to conditionally load NestJS modules based on server "flavor":

- `env.flavors.graphql` → GqlModule, WorkspaceModule, CopilotModule, etc.
- `env.flavors.sync` → SyncModule
- `env.flavors.doc` → DocServiceModule

**Backend structure:**

- `src/base/` — Foundation (config, cache, event, graphql, prisma, redis, storage, websocket, job)
- `src/core/` — Business logic (auth, user, workspace, doc, permission, quota, sync)
- `src/plugins/` — Optional features (copilot, payment, oauth, calendar, captcha, indexer, license)

### Frontend: Custom DI Framework (`@toeverything/infra`)

The frontend uses a custom dependency injection system (NOT NestJS). Core concepts:

- **Framework** — DI container that registers and resolves dependencies
- **Service** — Singleton business logic (e.g., `WorkspacesService`)
- **Entity** — Scoped instances (e.g., `Workspace`, `Doc`)
- **Store** — Reactive state holders (e.g., `DocsStore`)
- **Scope** — Hierarchical contexts: `RootScope → WorkspaceScope → DocScope`
- **LiveData** — Reactive state (RxJS-like observables), consumed via `useLiveData()` hook

Module registration pattern (all modules wired up in `packages/frontend/core/src/modules/index.ts`):

```typescript
export function configureWorkspaceModule(framework: Framework) {
  framework
    .service(WorkspacesService, [WorkspaceFlavoursService, ...])
    .entity(Workspace, [WorkspaceScope, FeatureFlagService])
    .store(DocsStore, [WorkspaceService, DocPropertiesStore])
    .scope(WorkspaceScope)
}
```

### AI/Copilot Provider System

Providers live in `packages/backend/server/src/plugins/copilot/providers/`. To add a new provider:

1. Create a class extending `CopilotProvider` in `providers/`
2. Implement required methods (`text()`, `streamText()`, `embedding()`, etc.) — uses Vercel AI SDK
3. Add to the `CopilotProviders` array in `providers/index.ts`
4. Configure in `config.ts`

### BlockSuite Editor

Separate framework in `blocksuite/`:

- `affine/blocks/*` — Block implementations (paragraph, list, code, database, etc.)
- `affine/components/` — Reusable editor UI components
- `affine/gfx/*` — Canvas/edgeless elements (shapes, connectors, mindmap)
- `framework/*` — Core editor logic (store, sync, std)

Supports page mode (linear docs) and edgeless mode (infinite canvas). Uses LitElement web components.

### Styling

Vanilla Extract — CSS-in-TypeScript with zero runtime. Style files use `.css.ts` extension.

### Routing

React Router v6 with lazy-loaded routes in `packages/frontend/core/src/desktop/router.tsx`. Key routes:

- `/workspace/:workspaceId/*` — Main workspace view
- `/onboarding`, `/subscribe`, `/invite/:inviteId` — User flow pages

## Where to Find Things

| What                           | Where                                                    |
| ------------------------------ | -------------------------------------------------------- |
| Backend services/modules       | `packages/backend/server/src/core/`                      |
| Backend plugins (AI, payments) | `packages/backend/server/src/plugins/`                   |
| GraphQL resolvers              | Search for `@Resolver()` decorator                       |
| Frontend feature modules       | `packages/frontend/core/src/modules/`                    |
| Frontend module registry       | `packages/frontend/core/src/modules/index.ts`            |
| UI components                  | `packages/frontend/component/src/`                       |
| DI framework source            | `packages/common/infra/src/framework/`                   |
| LiveData implementation        | `packages/common/infra/src/livedata/`                    |
| AI providers                   | `packages/backend/server/src/plugins/copilot/providers/` |
| E2E test utilities             | `tests/kit/`                                             |
| Custom CLI source              | `tools/cli/src/`                                         |
| Docker self-host configs       | `.docker/selfhost/`                                      |

## Self-Hosting (Docker)

Custom docker configs in `.docker/selfhost/`:

- `compose.yml` — Standard setup (Postgres + Redis + AFFiNE in Docker)
- `compose.external-postgres.yml` — External Postgres (e.g., host machine with pgvector)
- `build-caffine-image.sh` — Build custom fork image from caffine branch
