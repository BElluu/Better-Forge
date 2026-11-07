# @better-forge/ui

## 0.4.0

### Minor Changes

- 52383cf: Add an `ssoSections` option to `UsersPage`: a product's own sections in the Single sign-on dialog (say, who gets an account on a first sign-in), opened from the icon strip beside the form like the sections of a monitor, the first one open at once. The dialog's one Save button saves them together with the provider settings, with one password or SSO confirmation, and checks them before anything is saved. The dialog's Options (accepting providers without `email_verified`, disabling password sign-in) moved into the strip too; a product places them with `'options'` among its sections.

## 0.3.0

### Minor Changes

- c731858: The shared pages pass their texts through `uiText`, which calls the `translate` option of `configureUi`, so a product can show them in another language. Without `translate` nothing changes.

## 0.2.0

### Patch Changes

- Updated dependencies [81db866]
  - @better-forge/contracts@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [b6b39fb]
  - @better-forge/contracts@0.1.1
