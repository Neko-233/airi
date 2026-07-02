import { describe, expect, it } from 'vitest'

import {
  createFluxGrantFingerprint,
  isFluxGrantPreviewCurrent,
} from './flux-grant-safety'

describe('flux grant safety helpers', () => {
  it('keeps a preview current for the same normalized grant payload', () => {
    const previewFingerprint = createFluxGrantFingerprint({
      amount: 100,
      description: ' Promo grant ',
      emails: [' alice@example.com ', 'bob@example.com'],
      idempotencyKey: ' launch-week ',
    })

    expect(isFluxGrantPreviewCurrent(previewFingerprint, {
      amount: 100,
      description: 'Promo grant',
      emails: ['alice@example.com', 'bob@example.com'],
      idempotencyKey: 'launch-week',
    })).toBe(true)
  })

  it('invalidates the preview when a high-impact grant field changes', () => {
    const previewFingerprint = createFluxGrantFingerprint({
      amount: 100,
      description: 'Promo grant',
      emails: ['alice@example.com'],
      idempotencyKey: '',
    })

    expect(isFluxGrantPreviewCurrent(previewFingerprint, {
      amount: 200,
      description: 'Promo grant',
      emails: ['alice@example.com'],
      idempotencyKey: '',
    })).toBe(false)

    expect(isFluxGrantPreviewCurrent(previewFingerprint, {
      amount: 100,
      description: 'Promo grant',
      emails: ['alice@example.com', 'bob@example.com'],
      idempotencyKey: '',
    })).toBe(false)
  })
})
