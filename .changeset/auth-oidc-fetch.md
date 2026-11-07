---
'@better-forge/auth': minor
---

Add a `fetch` option to `createAuth`: it sends the requests to the SSO provider (discovery, token exchange, keys), so a product can route them through an outbound proxy.
