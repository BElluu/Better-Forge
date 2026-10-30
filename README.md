# Better-Forge

The shared modules of the Better products (BetterStatusPage, BetterOnCall, and the products that follow): accounts and
SSO, audit log, vaults, notifications, backups, configuration as code, an MCP endpoint, the HTTP runtime and the React
interface. Each module is an npm package published from this repository (MIT).

| Package | What it is |
|---|---|
| `@better-forge/contracts` | browser-safe types shared by the modules |
| `@better-forge/db` | SQLite (`node:sqlite`) and Drizzle bootstrap, transactions, migration registry |
| `@better-forge/audit` | audit log: write, redacted diffs, routes |
| `@better-forge/auth` | users, sessions, 2FA, SSO/OIDC, roles, API tokens, setup and sign-in routes |
| `@better-forge/vault` | local and HashiCorp vaults, secret resolution, `vault:use` checks, routes |
| `@better-forge/notify` | channels, transports, delivery engine, alert hygiene, routes |
| `@better-forge/backup` | backup, restore, verification, scheduler, command lines, routes |
| `@better-forge/config-as-code` | YAML engine with a kind registry, entity keys, routes |
| `@better-forge/mcp` | Model Context Protocol endpoint: Bearer-only access, scoped tools |
| `@better-forge/mirror` | publishes files to static hosting (S3-compatible) |
| `@better-forge/runtime` | `createBetterApp`, health, SSE, update check, app lock, shutdown |
| `@better-forge/ui` | admin shell, shared pages, API client, styles and Tailwind preset |

`apps/template` is a small application built only from these packages (setup, sign-in, users, API tokens, audit log,
vault, notifications, backups). It is the proof that they stand on their own, and the place to start a new product.

## Working here

```
npm ci
npm run build                # the packages, then the template
npm test                     # package tests, template boot test, UI tests
npm run lint
npm run typecheck
npm run test:isolation       # each package built and tested alone, with only what it declares
npm run test:e2e:template    # the template in a browser
```

Node 26.10 or newer. Rules, the layering, how to change a module together with a product, and how a release is made are
in [CLAUDE.md](CLAUDE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Versions

All packages are released together at one version and depend on each other at exactly that version. The version is
`0.x`: a breaking change is a minor, anything else a patch, and the API is not promised stable until a second product
runs on it. Add a [Changeset](https://github.com/changesets/changesets) to a change with `npm run changeset`; releases
are made by the **Release** workflow when a pull request with a changeset is merged.
