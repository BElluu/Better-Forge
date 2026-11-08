---
'@better-forge/notify': patch
---

Check a Twilio channel when it is created or changed: `channelConfigError` now calls `twilioConfigError`, so a configuration without a valid Account SID, numbers or auth token is refused with `400` instead of failing at the first delivery.
