---
'@better-forge/ui': minor
---

Add an `ssoSections` option to `UsersPage`: a product's own sections in the Single sign-on dialog (say, who gets an account on a first sign-in), opened from the icon strip beside the form like the sections of a monitor, the first one open at once. The dialog's one Save button saves them together with the provider settings, with one password or SSO confirmation, and checks them before anything is saved. The dialog's Options (accepting providers without `email_verified`, disabling password sign-in) moved into the strip too; a product places them with `'options'` among its sections.
