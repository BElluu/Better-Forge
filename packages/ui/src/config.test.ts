import { afterEach, describe, expect, it } from 'vitest'
import { configureUi, uiText } from './config'

describe('uiText', () => {
  afterEach(() => configureUi({ translate: undefined }))

  it('leaves a text as it is until the application asks for a translation', () => {
    expect(uiText('Save')).toBe('Save')
  })

  it('asks the application to translate the text', () => {
    configureUi({ translate: (text) => (text === 'Save' ? 'Zapisz' : text) })
    expect(uiText('Save')).toBe('Zapisz')
    expect(uiText('Cancel')).toBe('Cancel')
  })
})
