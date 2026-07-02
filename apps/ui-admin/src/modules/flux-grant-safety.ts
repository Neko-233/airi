export interface FluxGrantFingerprintInput {
  amount: number
  description: string
  emails: string[]
  idempotencyKey?: string
}

/**
 * Builds a stable fingerprint for the Flux grant preview payload.
 *
 * Use when:
 * - A bulk grant must prove the visible form still matches the latest preview.
 *
 * Expects:
 * - `emails` already represents the recipient list parsed from the form.
 *
 * Returns:
 * - A JSON fingerprint that changes when grant-critical fields change.
 */
export function createFluxGrantFingerprint(input: FluxGrantFingerprintInput): string {
  return JSON.stringify({
    amount: Number(input.amount),
    description: input.description.trim(),
    emails: input.emails.map(email => email.trim()).filter(Boolean),
    idempotencyKey: input.idempotencyKey?.trim() || '',
  })
}

/**
 * Checks whether the current Flux grant form is covered by a prior preview.
 *
 * Use when:
 * - The admin UI needs to disable or warn before issuing a bulk Flux grant.
 *
 * Expects:
 * - `previewFingerprint` was captured immediately after a successful dry run.
 *
 * Returns:
 * - `true` only when the current high-impact grant fields match the preview.
 */
export function isFluxGrantPreviewCurrent(
  previewFingerprint: string | null,
  input: FluxGrantFingerprintInput,
): boolean {
  return previewFingerprint === createFluxGrantFingerprint(input)
}
