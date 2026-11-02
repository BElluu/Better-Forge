# @better-forge/notify

## 0.4.0

### Minor Changes

- 15e15bf: A `Notice` can carry `actions`, links shown as buttons in Slack, Teams, Telegram and ntfy (only http and https addresses, at most five), so a product can put a button such as "Acknowledge" in a message without an app of its own.

## 0.3.0

### Minor Changes

- 9c6857f: Add a `serviceFetch` option to `createTransports`: it sends the requests to the fixed hosts of Telegram, Pushover, Twilio and ntfy.sh, so a product can route them through an outbound proxy.

## 0.2.0

### Minor Changes

- 81db866: Add a Twilio channel type: text messages and voice calls. The recipient may be a placeholder such as `{{phone}}` that the application fills in for each event; the auth token is masked and can come from a vault.

### Patch Changes

- Updated dependencies [81db866]
  - @better-forge/contracts@0.2.0
  - @better-forge/audit@0.2.0
  - @better-forge/vault@0.2.0
  - @better-forge/db@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [b6b39fb]
  - @better-forge/contracts@0.1.1
  - @better-forge/audit@0.1.1
  - @better-forge/vault@0.1.1
  - @better-forge/db@0.1.1
