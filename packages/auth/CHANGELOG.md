# @better-forge/auth

## 0.4.0

### Minor Changes

- 126754e: `resolveUnknownSsoUser` receives the ID token claims and the `returnTo` of the sign-in. **Security-relevant:** the library no longer refuses `admin` for an account created by SSO, so a hook that passes a role through must enforce its own rules. `OidcTestResult` reports the `role` a test sign-in would create.

## 0.3.0

### Minor Changes

- dd295c6: Add a `fetch` option to `createAuth`: it sends the requests to the SSO provider (discovery, token exchange, keys), so a product can route them through an outbound proxy.

## 0.2.0

### Patch Changes

- Updated dependencies [81db866]
  - @better-forge/contracts@0.2.0
  - @better-forge/audit@0.2.0
  - @better-forge/db@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [b6b39fb]
  - @better-forge/contracts@0.1.1
  - @better-forge/audit@0.1.1
  - @better-forge/db@0.1.1
