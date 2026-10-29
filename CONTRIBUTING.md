# Contributing

The rules and the reasons behind them are in [CLAUDE.md](CLAUDE.md). The short version of a change:

1. Branch from `main`, make the change with tests. A package that needs something from a product gets it through an
   option, never by importing the product.
2. `npm run changeset` and describe the change for the people who use the package. Pick `minor` for a breaking change
   or a new feature while the version is `0.x`, `patch` for anything else. All packages are released together, so it
   does not matter which package the changeset names.
3. Before opening a pull request: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:isolation`,
   `npm run check:icons` and `npm run check:packages`. CI runs the same, plus the template in a browser.
4. Merge. The **Release** workflow opens (or updates) a "Version packages" pull request; merging it publishes to npm.

## Trying a change in a product before it is released

In the product's repository (it keeps this one in the folder next to it): `npm run kit:local` builds the modules and
copies them into the product's `node_modules/@better-forge/`; `npm run kit:local -- --watch` does it again after every
build here; `npm ci` puts the released versions back. The packages are copied, not linked, so the product keeps a single
copy of React, Fastify and Drizzle.

## Maintainers: one-time setup

- npm: the `@better-forge` organization, with the first release published by hand; then, for each package, *Settings →
  Trusted Publisher → GitHub Actions* (`BElluu` / `Better-Forge` / `release.yml`) and *Require two-factor
  authentication and disallow tokens*.
- GitHub: Actions may create pull requests (Settings → Actions → General); a fine-grained token for this repository
  (contents and pull requests: write) as the secret `CHANGESETS_TOKEN`; a ruleset on `main` that requires a pull request
  and the `quality` check.
