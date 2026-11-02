---
'@better-forge/notify': minor
---

Add a `serviceFetch` option to `createTransports`: it sends the requests to the fixed hosts of Telegram, Pushover, Twilio and ntfy.sh, so a product can route them through an outbound proxy.
