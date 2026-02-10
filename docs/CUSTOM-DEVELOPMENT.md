# Custom Development & Upstream Sync Guide

This repo is a clone/fork of [AFFiNE](https://github.com/toeverything/AFFiNE). This guide explains how to develop custom features while staying in sync with upstream.

## 1. Git workflow: staying in sync with upstream

### Add the upstream remote (one-time)

```bash
git remote add upstream https://github.com/toeverything/AFFiNE.git
git fetch upstream
```

Your `origin` stays your fork; `upstream` is the official AFFiNE repo.

### Recommended branch strategy

- **Option A – Work on `canary` with a custom branch for risky changes**

  - Keep most custom work on `canary` (or a branch off it).
  - When you want to pull latest AFFiNE: merge or rebase from `upstream/canary` into your branch (see below).
  - Use a separate branch (e.g. `custom/ollama`) only when you want to experiment without touching `canary`.

- **Option B – Dedicated “custom” branch**
  - Create e.g. `custom` from `canary`, do all custom work on `custom`.
  - Periodically merge or rebase `upstream/canary` into `custom` so you get latest fixes and features.

### Pulling latest from AFFiNE

From your working branch (e.g. `canary` or `custom`):

```bash
git fetch upstream
git merge upstream/canary
# or, for a linear history:  git rebase upstream/canary
```

Resolve any conflicts, then run tests and build:

```bash
yarn install
yarn typecheck
yarn workspace @affine/server build
```

Do this regularly (e.g. weekly or before big upgrades) to avoid large merge conflicts.

---

## 2. Where to put custom code (to minimize conflicts)

Upstream changes rarely touch **new** files. To keep merges easy:

### Prefer: new files and extension points

- **New plugins / providers**  
  Add new providers or plugins in the same structure as existing ones, e.g.:
  - Backend: `packages/backend/server/src/plugins/<plugin>/` (e.g. `copilot/providers/ollama.ts`).
  - Frontend: new modules under `packages/frontend/core/src/modules/` or new components under `packages/frontend/component/`.
- **New packages**  
  For larger features, add a new package under `packages/` and depend on it from the app; upstream almost never touches your new package.
- **Configuration / env**  
  Prefer config files and environment variables over changing core code when possible.

### Avoid when possible: editing core files

- Editing shared core (e.g. `packages/backend/server/src/core/`, `packages/frontend/core/`) or base types increases the chance of conflicts when you merge `upstream/canary`.
- If you must patch core, keep changes small and document them (e.g. in this file or in code comments) so you can re-apply or adapt after upstream merges.

### Example: your Ollama copilot provider

Your custom Ollama provider fits the “new file” pattern:

- **New file:** `packages/backend/server/src/plugins/copilot/providers/ollama.ts`
- **Single touch in upstream code:** add `OllamaProvider` to the `CopilotProviders` array in `packages/backend/server/src/plugins/copilot/providers/index.ts`

That’s only one line (and one import) in a file upstream might change. Document that you add Ollama there so you can re-apply it after a merge if needed.

---

## 3. After merging upstream: re-apply customizations

If upstream changes a file you also changed:

1. Open the conflicted file and resolve conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
2. Re-apply your custom logic (e.g. re-add Ollama to `CopilotProviders` if that file was overwritten).
3. Run `yarn typecheck` and the relevant tests (e.g. `packages/backend/server` or copilot tests).

Keeping a short “customization checklist” (e.g. in this doc or in `CLAUDE.md`) helps: list files you always touch and what you add (e.g. “providers/index.ts: add OllamaProvider to CopilotProviders”).

---

## 4. Quick reference

| Goal                      | Command / action                                                     |
| ------------------------- | -------------------------------------------------------------------- |
| Add upstream once         | `git remote add upstream https://github.com/toeverything/AFFiNE.git` |
| Fetch latest AFFiNE       | `git fetch upstream`                                                 |
| Merge latest into current | `git merge upstream/canary`                                          |
| Rebase current on latest  | `git rebase upstream/canary`                                         |
| Push your branch to fork  | `git push origin <branch>`                                           |
| Prefer for new features   | New plugins/providers/packages; avoid editing core when possible     |

---

## 5. Contributing back (optional)

If a custom feature is generic and useful (e.g. an Ollama provider), consider opening a PR to [AFFiNE](https://github.com/toeverything/AFFiNE). That way you get the feature in upstream and reduce the need to maintain a fork. See [AFFiNE contributing docs](https://docs.affine.pro/docs/contributing) and the repo’s issue/PR templates.
