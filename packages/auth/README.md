# @better-forge/auth

Users, sessions, 2FA, SSO/OIDC, roles, API tokens and sign-in routes.

Status: skeleton. Depends on: `@better-forge/db`, `@better-forge/audit`.

## Creating accounts at the first SSO sign-in

Without a hook an SSO sign-in only matches an existing user. `hooks.resolveUnknownSsoUser({ email, subject, issuer, claims, returnTo })` lets the application create one: return `{ role }` to create the account, `null` to refuse.

- It is called only after the ID token was validated, the email is present and verified, and no user matches.
- `claims` are the validated ID token claims, for mapping groups to a role. `returnTo` is the `returnTargets` entry the sign-in started with; the browser picks it, so use it to tell which sign-in page was used, not to decide who to trust.
- Any registered role may be returned, `admin` included; an unregistered one refuses the sign-in. The library does not limit what the hook grants, so the application enforces its own rules (an email-domain allow-list, an exact group match, no default role when nothing matches).
- The role is set when the account is created. Later sign-ins, and a change of groups at the provider, do not change it.
- Return `reason` to say which rule gave the role; it is written to the audit log as `rule` next to the role, and the test sign-in shows it.
- The hook is not called for confirmations. The test sign-in runs it without `returnTo` and reports the role in `OidcTestResult.role`.
