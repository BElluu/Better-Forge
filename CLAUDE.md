# Better-Forge

Shared modules of the Better products (BetterStatusPage, BetterOnCall, ...), as an npm-workspaces monorepo: `packages/*` are published to npm as `@better-forge/<name>`, `apps/template` is a small application built only from them. Node 26.10 or newer.

## Layout

| Package | Owns |
|---|---|
| `contracts` | browser-safe types (API tokens, audit, notification channels, locales) |
| `db` | SQLite + Drizzle bootstrap, transactions, `DbModule` migration registry |
| `audit`, `auth`, `vault` | audit log; accounts, sessions, SSO, 2FA, API tokens, setup routes, `registerAdminApi`; vaults and secrets |
| `notify` | channels, transports, delivery engine, alert hygiene, routes, delivery worker |
| `backup`, `config-as-code` | backup/restore/CLI/scheduler/routes; YAML engine with a kind registry, entity keys |
| `mcp` | MCP endpoint (Streamable HTTP): Bearer-only access, scoped tools, bounded and sanitised output |
| `mirror` | publishes a set of files to static hosting (S3-compatible transport, change detection, interval runner) |
| `runtime` | `createBetterApp`, health, SSE, update check, app lock, shutdown, data paths |
| `ui` | React shell, shared pages, API client, styles and Tailwind preset |

## Rules

- Dependency direction is one way: products and `apps/template` use `packages/*`; between packages only along the graph in `eslint.boundaries.mjs`. A package never imports from an app and never reaches into another package's `src/` (the ESLint boundary rule enforces both). `npm run check:packages` checks the manifests against the graph.
- Every package stands on its own: it imports only what it declares in `package.json`. `npm run test:isolation` builds and tests each package in a temporary directory with only those; CI runs it.
- No global singletons. A module receives what it needs through a factory (`createAuth({ db, audit, vault, ... })`), so two applications or two tests can each have their own.
- A package owns its tables, migrations, tests and README, and exposes a small public API through `exports` only.
- Nothing specific to one product (its name, its monitors, incidents, status pages, on-call schedules) may appear in a package, including comments, error messages and translation keys. Wording comes in through options (`configureUi`, factory options). `packages/ui` and `packages/config-as-code` have a test that scans their sources for it.
- `apps/template` may import `@better-forge/*` only.
- Outbound requests to an address a user typed in take a `fetch` from the product (see `createTransports({ fetch })`), so the product decides which networks they may reach.
- Packages are consumed from `dist`. `npm run build:kit` builds them in dependency order and skips a package whose sources, manifest and dependencies did not change (`--force` builds all). Watch one with `npm run dev -w @better-forge/<name>`.
- Icons come from a subset of Material Symbols. After using a new icon name in `packages/ui` or the template, run `npm run build:icons`; it rewrites the font and `packages/ui/icons.json`, the list of icons a product must add to its own font (`npm run check:icons` fails in CI otherwise).
- Tests run through `tsx`, which does not check types; `npm run typecheck` does.

## Changes and releases

- Every change to a package that should be released comes with a changeset (`npm run changeset`). All packages are released together at one version (`fixed` in `.changeset/config.json`), and each depends on the others at exactly that version. While the version is `0.x`, a breaking change is a minor and anything else a patch.
- CI (`quality`) runs on pull requests only; the ruleset on `main` requires a pull request, the `quality` check and a branch that is up to date with `main`. A push to `main` runs the **Release** workflow: with changesets it raises the versions, commits "Version packages" to `main`, publishes every package to npm (trusted publishing, with provenance) and creates the GitHub release; without changesets it does nothing. So a merged pull request with a changeset is released at once, and the version cannot be taken back: check the changeset before merging. No npm token is stored; `CHANGESETS_TOKEN` is a fine-grained token for this repository that lets the workflow push the version commit (the ruleset has a bypass for the repository admin). A release that stopped half way is finished with Actions → Release → Run workflow.
- Never `npm unpublish` a released version (its number cannot be reused); `npm deprecate` it and release a fix.
- Keep each package's README true to its API. Docs for the products that use the modules live in those products.
- Commits are short and plain ("Add a rate limit to the login route"). No AI attribution: no `Co-Authored-By`, no AI mentions in commits, PRs or comments.

## Working with a product at the same time

A change to a module often starts in a product (BetterStatusPage, BetterOnCall). Order of work:

1. Make the change here, with a changeset and tests; run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:isolation`.
2. Try it in the product without publishing: in the product, `npm run kit:local` builds this repository (the folder next to it, or `KIT_DIR`) and copies the built packages into the product's `node_modules/@better-forge/` (`-- --watch` repeats it on every build; `npm ci` undoes it). The copy is used instead of a symlink so that React, Fastify and Drizzle resolve to the product's single copy.
3. Merge here (the release follows by itself) and wait for it.
4. In the product, raise every `@better-forge/*` to the released version (one version for all of them), run the product's checks and commit.

Do not commit `file:` or `link:` dependencies in a product.

## Starting a new Better product

Copy `apps/template` (`npx degit BElluu/Better-Forge/apps/template my-product`). The server is `db.ts` (compose the `DbModule`s), `kit.ts` (create audit, vault, roles, auth, notify, backup), `routes.ts` (`registerAdminApi` groups) and `index.ts` (`createBetterApp`). The interface is `createAdminShell` plus the pages of `@better-forge/ui`, configured by `configureUi` (storage prefix, API base, CSRF cookie, base path, brand, texts). Import `@better-forge/ui/styles.css`; for the icons either import `@better-forge/ui/icons.css` (the icons of the shared pages only) or build a font that also holds the names in `@better-forge/ui/icons.json`. Add `uiContent` from `@better-forge/ui/tailwind-preset` to the Tailwind `content`.

What a product registers: roles (`createRoleRegistry().register`), API token parts (`createTokenCatalogue` resources plus a `registerAdminApi` group with the part), config kinds (`ConfigKind` in `createConfigEngine`), health contributors (`createSystemHealth`), audit entities (`AuditEntities` prop of the audit log page), notification events (`createNotifyEngine`).

## Adding a package

1. `packages/<name>/` with `package.json` (copy a neighbour: name `@better-forge/<name>`, the current version, `repository.directory`, `publishConfig.access`, `files`, `exports` with `./package.json`), `tsconfig.json`, `src/`, `test/`, `README.md`, `LICENSE`.
2. Add it to `PACKAGE_GRAPH` in `eslint.boundaries.mjs` with the packages it may import; list those under `dependencies` at the current version.
3. `npm install`, `npm run build:kit`, `npm run check:packages`, `npm run test:isolation`.
4. A changeset (`minor` for a new package).
