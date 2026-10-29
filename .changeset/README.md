# Changesets

Every change to a package that should reach npm comes with a changeset: run `npm run changeset`, pick the packages
and the kind of change, and commit the file it writes. While the packages are `0.x`, a breaking change is a **minor**
and anything else a **patch**; there is no stability promise until a second product runs on them.
