// Checks what a release depends on, so a mistake fails in CI and not on npm:
//   - every published package has the same version (they are released together);
//   - a package lists the other @better-forge packages it uses under `dependencies`, with exactly that version, never
//     as a peer, and only the ones the module graph in eslint.boundaries.mjs allows;
//   - a package that is published has the fields npm needs (license, repository, access, files).
//
//   node scripts/check-packages.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BETTER_SCOPE, PACKAGE_GRAPH } from '../eslint.boundaries.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const problem = (name, text) => problems.push(`${name}: ${text}`)

const manifests = fs.readdirSync(path.join(root, 'packages'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({ dir: entry.name, manifest: JSON.parse(fs.readFileSync(path.join(root, 'packages', entry.name, 'package.json'), 'utf8')) }))

const versions = new Set(manifests.map(({ manifest }) => manifest.version))
if (versions.size !== 1) problems.push(`the packages have different versions: ${[...versions].join(', ')}`)

for (const { dir, manifest } of manifests) {
  const name = manifest.name
  if (name !== `${BETTER_SCOPE}/${dir}`) problem(name, `the folder is ${dir}`)
  if (!(dir in PACKAGE_GRAPH)) problem(name, 'is missing from PACKAGE_GRAPH in eslint.boundaries.mjs')
  if (manifest.private) problem(name, 'is private, so it would not be published')
  if (manifest.publishConfig?.access !== 'public') problem(name, 'publishConfig.access must be "public"')
  if (!manifest.license) problem(name, 'has no license')
  if (!manifest.repository?.directory) problem(name, 'has no repository.directory')
  if (!fs.existsSync(path.join(root, 'packages', dir, 'LICENSE'))) problem(name, 'has no LICENSE file')

  for (const [field, deps] of [['peerDependencies', manifest.peerDependencies], ['devDependencies', manifest.devDependencies]]) {
    for (const dep of Object.keys(deps ?? {})) if (dep.startsWith(`${BETTER_SCOPE}/`)) problem(name, `${dep} is in ${field}; list it under dependencies`)
  }
  const allowed = new Set([...(PACKAGE_GRAPH[dir] ?? []), 'contracts'])
  for (const [dep, range] of Object.entries(manifest.dependencies ?? {})) {
    if (!dep.startsWith(`${BETTER_SCOPE}/`)) continue
    if (range !== manifest.version) problem(name, `${dep} is "${range}", it must be exactly ${manifest.version}`)
    if (!allowed.has(dep.slice(BETTER_SCOPE.length + 1))) problem(name, `${dep} is not allowed by PACKAGE_GRAPH`)
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`${manifests.length} packages, version ${[...versions][0]}`)
