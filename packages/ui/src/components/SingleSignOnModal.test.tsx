import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { ToastProvider } from './ui'
import { SingleSignOnModal, type SsoSection } from './SingleSignOnModal'

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
  getCurrentUser: vi.fn(() => ({ userId: 1, email: 'admin@example.test', role: 'admin', authMethod: 'password' })),
}))

const settings = {
  enabled: true, issuer: 'https://idp.example.test', clientId: 'app', hasClientSecret: false, scopes: '', redirectUri: '', buttonLabel: '',
  allowUnverifiedEmail: false, disablePasswordLogin: false,
}
const response = (envManaged: boolean) => ({ source: 'database', envManaged, defaultRedirectUri: 'http://localhost/cb', settings })

function open(section?: SsoSection) {
  const onClose = vi.fn()
  render(<ToastProvider><SingleSignOnModal onClose={onClose} {...(section ? { section } : {})} /></ToastProvider>)
  return onClose
}

describe('SingleSignOnModal section', () => {
  beforeEach(() => { vi.mocked(api.get).mockReset(); vi.mocked(api.put).mockReset(); vi.mocked(api.get).mockResolvedValue(response(false)) })

  it('saves the sign-in settings and the section with one Save, giving both the password', async () => {
    const user = userEvent.setup()
    const save = vi.fn().mockResolvedValue(undefined)
    vi.mocked(api.put).mockResolvedValue(settings)
    const Section: SsoSection = ({ onChange }) => <button type="button" onClick={() => onChange({ save })}>Change section</button>
    const onClose = open(Section)

    await user.click(await screen.findByRole('button', { name: 'Change section' }))
    await user.type(screen.getByLabelText('Your current password'), 'pw')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(api.put).toHaveBeenCalledWith('/admin/oidc', expect.objectContaining({ currentPassword: 'pw' }))
    expect(save).toHaveBeenCalledWith('pw')
  })

  it('saves nothing while the section reports a problem', async () => {
    const user = userEvent.setup()
    const Section: SsoSection = ({ onChange }) => <button type="button" onClick={() => onChange({ problem: 'Add a domain', save: vi.fn() })}>Change section</button>
    open(Section)

    await user.click(await screen.findByRole('button', { name: 'Change section' }))
    await user.type(screen.getByLabelText('Your current password'), 'pw')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Add a domain')).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and says what was saved when the section fails', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockResolvedValue(settings)
    const Section: SsoSection = ({ onChange }) => <button type="button" onClick={() => onChange({ save: () => Promise.reject(new Error('No domains')) })}>Change section</button>
    const onClose = open(Section)

    await user.click(await screen.findByRole('button', { name: 'Change section' }))
    await user.type(screen.getByLabelText('Your current password'), 'pw')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/sign-in settings were saved, the rest was not. No domains/)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('still saves the section when the provider is configured through the environment', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValue(response(true))
    const save = vi.fn().mockResolvedValue(undefined)
    const Section: SsoSection = ({ onChange }) => <button type="button" onClick={() => onChange({ save })}>Change section</button>
    open(Section)

    await user.click(await screen.findByRole('button', { name: 'Change section' }))
    await user.type(screen.getByLabelText('Your current password'), 'pw')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(save).toHaveBeenCalledWith('pw'))
    expect(api.put).not.toHaveBeenCalled()
  })
})
