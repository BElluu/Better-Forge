---
'@better-forge/auth': minor
---

`resolveUnknownSsoUser` receives the ID token claims and the `returnTo` of the sign-in. **Security-relevant:** the library no longer refuses `admin` for an account created by SSO, so a hook that passes a role through must enforce its own rules. `OidcTestResult` reports the `role` a test sign-in would create.
