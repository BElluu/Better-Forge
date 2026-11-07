---
'@better-forge/auth': patch
---

`resolveUnknownSsoUser` may return a `reason`, the rule that gave the role. It is recorded as `rule` with the account created by SSO in the audit log, and shown in the test sign-in result.
