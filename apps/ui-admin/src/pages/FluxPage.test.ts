// @vitest-environment jsdom

import type { App } from 'vue'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'

import FluxPage from './FluxPage.vue'

const mocks = vi.hoisted(() => ({
  fluxGrant: vi.fn(),
  fluxGrantPreview: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('../modules/api', () => ({
  adminApi: {
    fluxGrant: mocks.fluxGrant,
    fluxGrantPreview: mocks.fluxGrantPreview,
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

describe('flux page', () => {
  let app: App<Element>
  let host: HTMLElement

  beforeEach(() => {
    mocks.fluxGrantPreview.mockResolvedValue({ recipients: ['alice@example.com'] })
    mocks.fluxGrant.mockResolvedValue({ granted: 1 })
    document.body.innerHTML = '<div id="app"></div>'
    host = document.querySelector('#app')!
    app = createApp(FluxPage)
    app.mount(host)
  })

  afterEach(() => {
    app.unmount()
    vi.clearAllMocks()
  })

  it('requires a current preview before issuing a bulk grant', async () => {
    setRecipients('alice@example.com')
    await nextTick()

    grantButton().click()
    await flushPromises()

    expect(mocks.fluxGrant).not.toHaveBeenCalled()

    buttonByText('预览').click()
    await flushPromises()

    grantButton().click()
    await nextTick()

    expect(mocks.fluxGrant).not.toHaveBeenCalled()

    buttonByText('确认发放').click()
    await flushPromises()

    expect(mocks.fluxGrant).toHaveBeenCalledWith({
      amount: 100,
      description: '管理员活动 Flux 发放',
      emails: ['alice@example.com'],
    })
  })
})

function setRecipients(value: string) {
  const textarea = document.querySelector('textarea')
  if (!(textarea instanceof HTMLTextAreaElement))
    throw new Error('Recipients textarea not found')
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

function grantButton(): HTMLButtonElement {
  return buttonByText('发放 Flux')
}

function buttonByText(text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll('button'))
    .find(item => item.textContent?.includes(text))
  if (!(button instanceof HTMLButtonElement))
    throw new Error(`Button "${text}" not found`)
  return button
}

async function flushPromises() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}
