import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { ToastProvider } from './ui'
import { SingleSignOnModal, type SsoSectionDef, type SsoSectionEntry, type SsoSectionSave } from './SingleSignOnModal'

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
  getCurrentUser: vi.fn(() => ({ userId: 1, email: 'admin@example.test', role: 'admin', authMethod: 'password' })),
}))

const settings = {
  enabled: true, issuer: 'https://idp.example.test', clientId: 'app', hasClientSecret: false, scopes: '', redirectUri: '', buttonLabel: '',
  allowUnverifiedEmail: false, disablePasswordLogin: false,
}
const response = (envManaged: boolean) => ({ source: 'database', envManaged, defaultRedirectUri: 'http://localhost/cb', settings })

/** A section with one button that reports `save` and a badge, as a product's section does after the user changed something. */
function section(key: string, label: string, save: SsoSectionSave, badge: string | null = null): SsoSectionDef {
  return { key, label, icon: 'lock', Component: ({ onChange }) => <button type="button" onClick={() => onChange(save, badge)}>Change {label}</button> }
}

function open(sections?: readonly SsoSectionEntry[]) {
  const onClose = vi.fn()
  render(<ToastProvider><SingleSignOnModal onClose={onClose} {...(sections ? { sections } : {})} /></ToastProvider>)
  return onClose
}

type User = ReturnType<typeof userEvent.setup>
const tab = (name: string, pressed: boolean) => screen.getByRole('button', { name, pressed })
const submit = async (user: User) => {
  await user.type(screen.getByLabelText('Your current password'), 'pw')
  await user.click(screen.getByRole('button', { name: 'Save' }))
}

describe('SingleSignOnModal sections', () => {
  beforeEach(() => { vi.mocked(api.get).mockReset(); vi.mocked(api.put).mockReset(); vi.mocked(api.get).mockResolvedValue(response(false)) })

  it('opens the first section, and lists them in the order of the product with Options where it put them', async () => {
    open([section('admin', 'Admin', { save: vi.fn() }), 'options', section('status', 'Status', { save: vi.fn() })])

    expect(await screen.findByRole('button', { name: 'Change Admin' })).toBeVisible()
    expect(screen.getAllByRole('toolbar')[0]!.querySelectorAll('button')).toHaveLength(3)
    expect([...screen.getByRole('toolbar').querySelectorAll('button')].map((button) => button.getAttribute('aria-label'))).toEqual(['Admin', 'Options', 'Status'])
    expect(tab('Admin', true)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Status', hidden: true })).not.toBeVisible()
  })

  it('puts Options first, and opens it, when the product does not place it', async () => {
    open([section('admin', 'Admin', { save: vi.fn() })])

    expect(await screen.findByRole('button', { name: 'Options', pressed: true })).toBeInTheDocument()
    expect(screen.getByLabelText(/Disable password sign-in/)).toBeVisible()
  })

  it('shows what a section reports on its icon, and a section when its icon is pressed', async () => {
    const user = userEvent.setup()
    open([section('admin', 'Admin', { save: vi.fn() }, '2'), section('status', 'Status', { save: vi.fn() }), 'options'])

    await user.click(await screen.findByRole('button', { name: 'Change Admin' }))
    expect(await screen.findByText('2')).toBeInTheDocument()
    await user.click(tab('Status', false))
    expect(screen.getByRole('button', { name: 'Change Status' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Change Admin', hidden: true })).not.toBeVisible()
  })

  it('saves the sign-in settings and every changed section with one Save, giving them all the password', async () => {
    const user = userEvent.setup()
    const first = vi.fn().mockResolvedValue(undefined)
    const second = vi.fn().mockResolvedValue(undefined)
    vi.mocked(api.put).mockResolvedValue(settings)
    const onClose = open([section('admin', 'Admin', { save: first }), section('status', 'Status', { save: second }), 'options'])

    await user.click(await screen.findByRole('button', { name: 'Change Admin' }))
    await user.click(tab('Status', false))
    await user.click(screen.getByRole('button', { name: 'Change Status' }))
    await submit(user)

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(api.put).toHaveBeenCalledWith('/admin/oidc', expect.objectContaining({ currentPassword: 'pw' }))
    expect(first).toHaveBeenCalledWith('pw')
    expect(second).toHaveBeenCalledWith('pw')
  })

  it('saves nothing and opens the section that reports a problem', async () => {
    const user = userEvent.setup()
    open([section('admin', 'Admin', { save: vi.fn() }), section('status', 'Status', { problem: 'Add a domain', save: vi.fn() }), 'options'])

    await screen.findByRole('button', { name: 'Change Admin' })
    await user.click(tab('Status', false))
    await user.click(screen.getByRole('button', { name: 'Change Status' }))
    await user.click(tab('Admin', false))
    await submit(user)

    expect(await screen.findByText('Add a domain')).toBeInTheDocument()
    expect(tab('Status', true)).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('keeps the dialog open, opens the section that failed and says what was saved', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockResolvedValue(settings)
    const onClose = open([section('admin', 'Admin', { save: () => Promise.reject(new Error('No domains')) })])

    await user.click(await screen.findByRole('button', { name: 'Admin', pressed: false }))
    await user.click(screen.getByRole('button', { name: 'Change Admin' }))
    await user.click(tab('Options', false))
    await submit(user)

    expect(await screen.findByText(/Part of it was saved, the rest was not. No domains/)).toBeInTheDocument()
    expect(tab('Admin', true)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('still saves the sections when the provider is configured through the environment', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValue(response(true))
    const save = vi.fn().mockResolvedValue(undefined)
    open([section('admin', 'Admin', { save })])

    await user.click(await screen.findByRole('button', { name: 'Admin', pressed: false }))
    await user.click(screen.getByRole('button', { name: 'Change Admin' }))
    await submit(user)

    await waitFor(() => expect(save).toHaveBeenCalledWith('pw'))
    expect(api.put).not.toHaveBeenCalled()
  })
})
