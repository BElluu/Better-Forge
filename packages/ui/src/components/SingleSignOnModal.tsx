import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { api } from '../api/client'
import { uiConfig } from '../config'
import { Alert, ErrorState, Field, LoadingState, Switch, useToast } from './ui'
import { ModalFooter, ModalHeader, ModalShell } from './ModalShell'
import { SidePanelFrame, SideTabStrip, type SidePanelMeta } from './SidePanel'
import { SsoConfirmationNote, isSsoSession, useSsoConfirmation } from './SsoConfirmation'
import { uiText } from '../config'

interface OidcSettings {
  enabled: boolean
  issuer: string
  clientId: string
  hasClientSecret: boolean
  scopes: string
  redirectUri: string
  buttonLabel: string
  allowUnverifiedEmail: boolean
  disablePasswordLogin: boolean
}
interface OidcResponse { source: 'env' | 'database' | 'none'; envManaged: boolean; defaultRedirectUri: string; settings: OidcSettings }
interface Message { tone: 'success' | 'error'; text: string }

const errorText = (e: unknown) => e instanceof Error ? e.message : String(e)
const CARD = { background: 'var(--m3-surface-container-lowest)', border: '1px solid var(--m3-outline-variant)', color: 'var(--m3-on-surface)' }

/** What saving a product's section of the modal does. */
export interface SsoSectionSave {
  /** Why the section cannot be saved as it stands. Checked before anything is saved, so the modal never saves only a part. */
  problem?: string | undefined
  /** Saves the section. `currentPassword` is set unless the session is an SSO one, whose confirmation the modal handles. */
  save(currentPassword: string | undefined): Promise<void>
}

export interface SsoSectionProps {
  /**
   * Tells the modal what saving the section does, or null when nothing changed, and what its icon in the strip shows
   * (a short text such as a count, or null for nothing). Call it whenever the section's state changes.
   */
  onChange(save: SsoSectionSave | null, badge?: string | null): void
}

/** A section of the application's own, opened from the strip beside the dialog; the one Save button saves it too. */
export interface SsoSectionDef {
  key: string
  label: string
  /** A Material Symbols icon name. */
  icon: string
  Component: ComponentType<SsoSectionProps>
}

/** `'options'` stands for the dialog's own Options section, so a product chooses where it goes among its own. */
export type SsoSectionEntry = SsoSectionDef | 'options'

const OPTIONS_META: SidePanelMeta = { icon: 'tune', label: 'Options' }
const keyOf = (entry: SsoSectionEntry) => (entry === 'options' ? 'options' : entry.key)

/** The first section is open when the dialog opens. Without `options` among the entries it comes first. */
export function SingleSignOnModal({ onClose, sections = [] }: { onClose: () => void; sections?: readonly SsoSectionEntry[] }) {
  const entries: readonly SsoSectionEntry[] = sections.includes('options') ? sections : ['options', ...sections]
  const productSections = entries.filter((entry): entry is SsoSectionDef => entry !== 'options')
  const [active, setActive] = useState<string | null>(() => keyOf(entries[0]!))
  const saves = useRef(new Map<string, SsoSectionSave | null>())
  const reporters = useRef(new Map<string, SsoSectionProps['onChange']>())
  const [badges, setBadges] = useState<Record<string, string | null>>({})
  const reporterFor = (key: string) => {
    let report = reporters.current.get(key)
    if (!report) {
      report = (save, badge = null) => {
        saves.current.set(key, save)
        setBadges((prev) => ((prev[key] ?? null) === badge ? prev : { ...prev, [key]: badge }))
      }
      reporters.current.set(key, report)
    }
    return report
  }
  const [data, setData] = useState<OidcResponse | null>(null)
  const [form, setForm] = useState<OidcSettings | null>(null)
  const [clientSecret, setClientSecret] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const sso = isSsoSession()
  const confirmation = useSsoConfirmation()
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const toast = useToast()

  const load = useCallback(() => api.get<OidcResponse>('/admin/oidc')
    .then((res) => { setData(res); setForm(res.settings); setLoadError('') })
    .catch((e: unknown) => setLoadError(errorText(e))), [])
  useEffect(() => { void load() }, [load])

  if (!data || !form) {
    return <ModalShell align="top" onClose={onClose} label={uiText('Single sign-on')}>
      <div className="rounded-2xl p-6 w-full max-w-2xl" style={CARD}>
        {loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState label={uiText('Loading sign-in settings…')} />}
        {loadError && <button type="button" className="btn btn-secondary mt-4" onClick={onClose}>{uiText('Close')}</button>}
      </div>
    </ModalShell>
  }

  const locked = data.envManaged
  const update = (changes: Partial<OidcSettings>) => setForm({ ...form, ...changes })
  const redirectUri = form.redirectUri || data.defaultRedirectUri

  async function test() {
    setBusy('test'); setMessage(null)
    try {
      const result = await api.post<{ issuer: string }>('/admin/oidc/test', { issuer: form!.issuer, clientId: form!.clientId, redirectUri: form!.redirectUri })
      setMessage({ tone: 'success', text: `Connected to ${result.issuer}.` })
    } catch (e) { setMessage({ tone: 'error', text: errorText(e) }) } finally { setBusy(null) }
  }

  async function save() {
    setBusy('save'); setMessage(null)
    const extras = productSections.map((section) => ({ section, extra: saves.current.get(section.key) ?? null })).filter((item) => item.extra !== null)
    const refused = extras.find((item) => item.extra!.problem)
    if (refused) { setActive(refused.section.key); setMessage({ tone: 'error', text: refused.extra!.problem! }); setBusy(null); return }
    const password = sso ? undefined : currentPassword
    let providerSaved = null as OidcSettings | null
    let at = null as string | null
    const done = new Set<string>()
    try {
      // A repeat after the identity provider confirmed the session skips what was already saved.
      await confirmation.run(async () => {
        at = null
        if (!locked && !providerSaved) {
          providerSaved = await api.put<OidcSettings>('/admin/oidc', { ...form, clientSecret, ...(password === undefined ? {} : { currentPassword: password }) })
        }
        for (const { section, extra } of extras) {
          if (done.has(section.key)) continue
          at = section.key
          await extra!.save(password)
          done.add(section.key)
        }
        at = null
      })
      toast.success(providerSaved?.enabled ? 'Single sign-on settings saved. They apply immediately.' : 'Single sign-on settings saved.')
      onClose()
    } catch (err) {
      // Part of it may be saved: show the stored state, not the draft, and the section that failed.
      if (providerSaved) { setClientSecret(''); void load() }
      if (at) setActive(at)
      const text = errorText(err)
      setMessage({ tone: 'error', text: providerSaved || done.size ? `Part of it was saved, the rest was not. ${text}` : text })
      setBusy(null)
    }
  }

  const canSave = !locked || productSections.length > 0
  const optionsBadge = [form.allowUnverifiedEmail, form.disablePasswordLogin].filter(Boolean).length
  const meta: Record<string, SidePanelMeta> = { options: OPTIONS_META, ...Object.fromEntries(productSections.map((s) => [s.key, { icon: s.icon, label: s.label }])) }
  const tabs = entries.map((entry) => {
    const key = keyOf(entry)
    return { key, badge: key === 'options' ? (optionsBadge > 0 ? String(optionsBadge) : null) : badges[key] ?? null }
  })

  return <ModalShell align="top" onClose={busy ? undefined : onClose} label={uiText('Single sign-on')}>
    <div
      className="rounded-2xl my-8 flex flex-col lg:flex-row"
      style={{
        width: active ? 'min(1024px, calc(100vw - 32px))' : 'min(604px, calc(100vw - 32px))',
        background: 'var(--m3-surface-container-low)', border: '1px solid var(--m3-outline-variant)', color: 'var(--m3-on-surface)', transition: 'width 0.2s ease',
      }}
    >
    <div className={`flex-none min-w-0 w-full ${active ? 'lg:w-[560px]' : 'lg:w-[calc(100%-44px)]'}`}>
    <ModalHeader icon="passkey" title={uiText('Single sign-on')} onClose={onClose} />
    <form onSubmit={(e) => { e.preventDefault(); void save() }}>
    <div className="p-6 space-y-5">
      {locked && <Alert tone="warning">{uiText('Single sign-on is configured through OIDC_* environment variables on the server. Remove them to manage it here.')}</Alert>}
      {message && <Alert tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Alert>}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-headline text-base font-semibold">{uiText('OpenID Connect')}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--m3-secondary)' }}>
            Users must already exist; they are matched by the verified email from the identity provider.{uiConfig().texts.ssoSignInHint ? ` ${uiConfig().texts.ssoSignInHint}` : ""}
          </p>
        </div>
        <Switch checked={form.enabled} disabled={locked} onChange={(enabled) => update({ enabled })} aria-label={uiText('Enable single sign-on')} />
      </div>

      <fieldset disabled={locked || busy !== null} className="space-y-4">
        <Field label={uiText('Issuer URL')} hint={uiText('For example https://login.microsoftonline.com/<tenant>/v2.0 or https://keycloak.example.com/realms/main')}>
          <input className="input-m3" value={form.issuer} onChange={(e) => update({ issuer: e.target.value })} placeholder={uiText('https://idp.example.com')} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={uiText('Client ID')}>
            <input className="input-m3" value={form.clientId} onChange={(e) => update({ clientId: e.target.value })} autoComplete="off" />
          </Field>
          <Field label={uiText('Client secret')} hint={form.hasClientSecret ? 'A secret is stored. Leave empty to keep it. Re-enter it when you change the issuer URL or client ID.' : 'Optional for public clients.'}>
            <input
              className="input-m3" type="password" autoComplete="new-password" value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={form.hasClientSecret ? '••••••••' : ''}
            />
          </Field>
        </div>
        <Field label={uiText('Redirect URI')} hint={redirectUri ? <>Register <code>{redirectUri}</code> as the callback URL in your identity provider.</> : 'Set PUBLIC_URL on the server or enter the callback URL here.'}>
          <input className="input-m3" value={form.redirectUri} onChange={(e) => update({ redirectUri: e.target.value })} placeholder={data.defaultRedirectUri} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={uiText('Scopes')}>
            <input className="input-m3" value={form.scopes} onChange={(e) => update({ scopes: e.target.value })} placeholder={uiText('openid email profile')} />
          </Field>
          <Field label={uiText('Button label')}>
            <input className="input-m3" value={form.buttonLabel} onChange={(e) => update({ buttonLabel: e.target.value })} placeholder={uiText('Sign in with SSO')} />
          </Field>
        </div>
      </fieldset>

      {canSave && <>
        {sso
          ? <SsoConfirmationNote confirmation={confirmation} />
          : <Field label={uiText('Your current password')} hint={uiText('Required to change sign-in settings.')}>
            <input className="input-m3" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>}
      </>}
      {!locked && <p className="text-xs" style={{ color: 'var(--m3-secondary)' }}>{uiText('Test sign-in uses the saved settings, so save changes first.')}</p>}
    </div>

    <ModalFooter
      start={<>
        {!locked && (
          <button type="button" disabled={busy !== null || !form.issuer || !form.clientId} onClick={() => void test()} className="btn btn-secondary">
            {busy === 'test' ? 'Testing…' : 'Test connection'}
          </button>
        )}
        <button
          type="button" disabled={!locked && (busy !== null || !data.settings.issuer || !data.settings.clientId)}
          onClick={() => window.open('/api/v1/admin/oidc/test-sign-in', '_blank', 'noopener')}
          title={uiText('Signs in at the identity provider in a new tab with the saved settings and shows the claims and the outcome, without signing anyone in.')}
          className="btn btn-secondary"
        >
          Test sign-in
        </button>
      </>}
    >
      <button type="button" disabled={busy !== null} onClick={onClose} className="btn btn-secondary">{canSave ? 'Cancel' : 'Close'}</button>
      {canSave && <button type="submit" disabled={busy !== null} className="btn btn-primary">{busy === 'save' ? 'Saving…' : 'Save'}</button>}
    </ModalFooter>
    </form>
    </div>

    {/* The sections stay mounted while another is open or the panel is closed, so what was typed in them is kept. */}
    <SidePanelFrame meta={meta[active ?? keyOf(entries[0]!)]!} layout="responsive" className={active ? undefined : 'hidden'}>
      {entries.map((entry) => {
        const key = keyOf(entry)
        return <div key={key} hidden={key !== active} className="space-y-4">
          {entry === 'options'
            ? <fieldset disabled={locked || busy !== null} className="space-y-4">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={form.allowUnverifiedEmail} onChange={(e) => update({ allowUnverifiedEmail: e.target.checked })} />
                <span>Accept identity providers that omit <code>email_verified</code>. Enable only if the email claim is trustworthy. Not needed for Microsoft Entra ID: add the <code>xms_edov</code> optional claim instead.</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={form.disablePasswordLogin} onChange={(e) => update({ disablePasswordLogin: e.target.checked })} />
                <span>Disable password sign-in. The identity provider must be reachable to save this. Set <code>{uiText('OIDC_FORCE_PASSWORD_LOGIN=true')}</code> on the server to recover if it goes down.</span>
              </label>
            </fieldset>
            : <entry.Component onChange={reporterFor(key)} />}
        </div>
      })}
    </SidePanelFrame>
    <SideTabStrip tabs={tabs} meta={meta} active={active} onToggle={setActive} layout="responsive" />
    </div>
  </ModalShell>
}
