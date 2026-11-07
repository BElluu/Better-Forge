import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { auditDbModule, createAudit } from '@better-forge/audit'
import { authDbModule, createAuth, createRoleRegistry, createTokenCatalogue, type Auth } from '@better-forge/auth'
import { openDatabase, runMigrations, type Database } from '@better-forge/db'

const cfg = {
  issuer: 'https://idp.example.test', clientId: 'c', clientSecret: '', scopes: 'openid email profile',
  redirectUri: 'https://app.example.test/cb', buttonLabel: 'SSO', allowUnverifiedEmail: false, disablePasswordLogin: false,
}
const claims = (extra: Record<string, unknown> = {}) => ({ sub: 'sub-1', email: 'New@Example.test', email_verified: true, groups: ['ops'], ...extra })

type Seen = { email: string; subject: string; issuer: string; claims: Record<string, unknown>; returnTo?: string | undefined }

let database: Database<Record<string, unknown>>
let seen: Seen[]
let answer: { role: string; reason?: string } | null
let auth: Auth

beforeEach(() => {
  database = openDatabase({ path: ':memory:', schema: { ...authDbModule.tables, ...auditDbModule.tables } })
  runMigrations(database.sqlite, [auditDbModule, authDbModule], { log: () => undefined })
  seen = []
  answer = { role: 'admin' }
  const roles = createRoleRegistry()
  roles.register(['viewer'], { fallback: 'viewer', defaultForNewUsers: 'viewer' })
  auth = createAuth({
    db: database.db, sqlite: database.sqlite,
    audit: createAudit({ db: database.db }),
    roles,
    tokens: createTokenCatalogue({ resources: [] }),
    secretBox: { encrypt: (s) => s, decrypt: (s) => s },
    cookies: { session: 's', csrf: 'c', oidcFlow: 'f', twoFactorChallenge: 't' },
    apiTokenPrefix: 'tst_', totpIssuer: 'Test', basePath: '/auth',
    urls: { signIn: '/login', home: '/', ssoConfirm: '/c', ssoTest: '/t' },
    publicUrl: () => '', secureCookies: () => false,
    rateLimits: { signIn: { max: 10, timeWindow: 1000 }, sensitiveAction: { max: 10, timeWindow: 1000 } },
    returnTargets: ['status'],
    hooks: { resolveUnknownSsoUser: async (user) => { seen.push(user); return answer } },
  })
})

afterEach(() => database.close())

describe('SSO provisioning of an unknown user', () => {
  it('gives the hook the validated claims and the returnTo of the sign-in, and creates the role it returns, admin included', async () => {
    const decision = await auth.oidc.evaluateOidcClaims(cfg, claims(), 'status')
    assert.deepEqual({ ...decision.provision }, { email: 'new@example.test', subject: 'sub-1', role: 'admin', reason: undefined })
    assert.equal(seen[0]?.returnTo, 'status')
    assert.deepEqual(seen[0]?.claims['groups'], ['ops'])
    assert.equal(seen[0]?.email, 'new@example.test')
  })

  it('passes no returnTo for a sign-in that did not start from a listed target', async () => {
    await auth.oidc.evaluateOidcClaims(cfg, claims())
    assert.equal(seen[0]?.returnTo, undefined)
  })

  it('refuses a role the application did not register', async () => {
    answer = { role: 'root' }
    const decision = await auth.oidc.evaluateOidcClaims(cfg, claims())
    assert.equal(decision.provision, undefined)
    assert.equal(decision.denial?.code, 'no_matching_account')
  })

  it('does not call the hook when the hook refuses, the email is unverified or the subject is missing', async () => {
    answer = null
    assert.equal((await auth.oidc.evaluateOidcClaims(cfg, claims())).provision, undefined)
    answer = { role: 'viewer' }
    seen.length = 0
    const unverified = await auth.oidc.evaluateOidcClaims(cfg, claims({ email_verified: false }))
    const noSubject = await auth.oidc.evaluateOidcClaims(cfg, claims({ sub: undefined }))
    assert.equal(unverified.denial?.code, 'email_not_verified')
    assert.equal(noSubject.provision, undefined)
    assert.equal(seen.length, 0)
  })

  it('records the rule that gave the role with the account, and reports it in the test result', async () => {
    answer = { role: 'viewer', reason: 'group Operators' }
    const decision = await auth.oidc.evaluateOidcClaims(cfg, claims())
    assert.equal(decision.provision?.reason, 'group Operators')
    await auth.oidc.provisionSsoUser(cfg, decision.provision!)
    const row = database.sqlite.prepare("SELECT diff FROM audit_log WHERE entity_type = 'user' AND action = 'create'").get() as { diff: string }
    assert.deepEqual(JSON.parse(row.diff), { email: 'new@example.test', role: 'viewer', createdBy: 'sso', issuer: cfg.issuer, rule: 'group Operators' })
  })

  it('creates the account bound to the identity and audits it', async () => {
    const decision = await auth.oidc.evaluateOidcClaims(cfg, claims())
    const user = await auth.oidc.provisionSsoUser(cfg, decision.provision!)
    assert.equal(user.role, 'admin')
    assert.equal(user.oidcSubject, 'sub-1')
    const again = await auth.oidc.evaluateOidcClaims(cfg, claims())
    assert.equal(again.user?.id, user.id)
    assert.equal(seen.length, 1)
  })
})
