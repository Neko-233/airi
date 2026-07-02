<script setup lang="ts">
import { errorMessageFromUnknown } from '@proj-airi/stage-shared'
import { DoubleCheckButton } from '@proj-airi/ui'
import { computed, reactive, shallowRef } from 'vue'
import { toast } from 'vue-sonner'

import { formatAdminNumber, t } from '../modules/admin-locale'
import { adminApi } from '../modules/api'
import {
  createFluxGrantFingerprint,
  isFluxGrantPreviewCurrent,
} from '../modules/flux-grant-safety'

const form = reactive({
  amount: 100,
  description: '管理员活动 Flux 发放',
  idempotencyKey: '',
  emails: '',
})

const loading = shallowRef(false)
const preview = shallowRef<unknown>(null)
const result = shallowRef<unknown>(null)
const previewFingerprint = shallowRef<string | null>(null)

const emails = computed(() =>
  form.emails
    .split(/[\n,;]/)
    .map(item => item.trim())
    .filter(Boolean),
)

const totalFlux = computed(() => emails.value.length * Number(form.amount || 0))
const currentGrantFingerprint = computed(() => createFluxGrantFingerprint(grantBody()))
const hasCurrentPreview = computed(() => isFluxGrantPreviewCurrent(previewFingerprint.value, grantBody()))
const grantDisabled = computed(() => loading.value || emails.value.length === 0 || !hasCurrentPreview.value)
const grantHint = computed(() => {
  if (emails.value.length === 0)
    return t('flux.noRecipients')
  if (!hasCurrentPreview.value)
    return t('flux.previewCurrent')
  return t('flux.currentPreviewMatched')
})

async function dryRun() {
  await submit(true)
}

async function grant() {
  await submit(false)
}

async function submit(isDryRun: boolean) {
  loading.value = true
  result.value = null
  try {
    const body = grantBody()
    if (isDryRun) {
      preview.value = await adminApi.fluxGrantPreview(body)
      previewFingerprint.value = currentGrantFingerprint.value
      toast.success(t('flux.previewGenerated'))
      return
    }

    if (!hasCurrentPreview.value) {
      toast.error(t('flux.needPreview'))
      return
    }

    result.value = await adminApi.fluxGrant(body)
    previewFingerprint.value = null
    toast.success(t('flux.grantIssued'))
  }
  catch (error) {
    toast.error(errorMessageFromUnknown(error, t('flux.failed')))
  }
  finally {
    loading.value = false
  }
}

/**
 * Builds the Flux grant API payload from the current form state.
 *
 * Use when:
 * - Preview, apply, and safety fingerprinting must use the same normalized data.
 *
 * Expects:
 * - `emails` is derived from the multiline recipient field.
 *
 * Returns:
 * - The admin API payload, omitting an empty idempotency key.
 */
function grantBody() {
  return {
    amount: Number(form.amount),
    description: form.description,
    emails: emails.value,
    ...(form.idempotencyKey.trim() ? { idempotencyKey: form.idempotencyKey.trim() } : {}),
  }
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function formatNumber(value: number): string {
  return formatAdminNumber(value)
}
</script>

<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <section class="panel p-5">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-sm font-semibold">
            {{ t('flux.bulkGrant') }}
          </h2>
          <p class="mt-1 text-sm text-neutral-500">
            {{ t('flux.subtitle') }}
          </p>
        </div>
        <span class="badge badge-green">
          <span class="i-lucide-shield-check" />
          {{ t('flux.guarded') }}
        </span>
      </div>

      <form class="space-y-4" @submit.prevent="dryRun">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs text-neutral-500 font-semibold uppercase">{{ t('flux.amountPerUser') }}</span>
            <input v-model.number="form.amount" class="field" min="1" type="number">
          </label>
          <label class="block">
            <span class="mb-1 block text-xs text-neutral-500 font-semibold uppercase">{{ t('flux.idempotencyKey') }}</span>
            <input v-model="form.idempotencyKey" class="field" :placeholder="t('flux.optionalRetryKey')" type="text">
          </label>
        </div>

        <label class="block">
          <span class="mb-1 block text-xs text-neutral-500 font-semibold uppercase">{{ t('flux.description') }}</span>
          <input v-model="form.description" class="field" type="text">
        </label>

        <label class="block">
          <span class="mb-1 block text-xs text-neutral-500 font-semibold uppercase">{{ t('flux.emails') }}</span>
          <textarea v-model="form.emails" class="textarea min-h-[260px]" placeholder="alice@example.com&#10;bob@example.com" />
        </label>

        <div class="flex flex-col gap-3 border-t border-neutral-200 pt-4 md:flex-row md:items-center md:justify-between">
          <div class="text-sm text-neutral-500">
            {{ t('flux.recipientsTotal', { count: emails.length, total: formatNumber(totalFlux) }) }}
          </div>
          <div class="flex flex-col items-start gap-2 md:items-end">
            <div class="text-xs" :class="hasCurrentPreview ? 'text-emerald-700' : 'text-amber-700'">
              {{ grantHint }}
            </div>
            <div class="flex gap-2">
              <button class="btn btn-secondary" :disabled="loading || emails.length === 0" type="submit">
                <span class="i-lucide-eye" />
                {{ t('action.preview') }}
              </button>
              <DoubleCheckButton
                size="sm"
                variant="caution"
                :disabled="grantDisabled"
                :loading="loading"
                @confirm="grant"
              >
                <span class="inline-flex items-center gap-2">
                  <span class="i-lucide-send" />
                  {{ t('user.grantFlux') }}
                </span>
                <template #confirm>
                  {{ t('action.confirmGrant') }}
                </template>
              </DoubleCheckButton>
            </div>
          </div>
        </div>
      </form>
    </section>

    <aside class="side-rail">
      <section class="side-section">
        <div class="text-sm text-neutral-500">
          {{ t('flux.recipients') }}
        </div>
        <div class="mt-3 text-3xl font-semibold">
          {{ formatNumber(emails.length) }}
        </div>
        <div class="mt-5 text-sm text-neutral-600">
          {{ t('flux.syncCap') }}
        </div>
      </section>

      <section class="side-section">
        <div class="side-section-title">
          {{ t('flux.previewTitle') }}
        </div>
        <pre v-if="preview" class="max-h-[280px] overflow-auto p-4 text-xs leading-5">{{ formatJson(preview) }}</pre>
        <div v-else class="empty-state min-h-40">
          <span class="i-lucide-clipboard-list text-2xl" />
          {{ t('flux.noPreviewYet') }}
        </div>
      </section>

      <section class="side-section">
        <div class="side-section-title">
          {{ t('flux.lastResult') }}
        </div>
        <pre v-if="result" class="max-h-[280px] overflow-auto p-4 text-xs leading-5">{{ formatJson(result) }}</pre>
        <div v-else class="empty-state min-h-40">
          <span class="i-lucide-history text-2xl" />
          {{ t('flux.noGrantResult') }}
        </div>
      </section>
    </aside>
  </div>
</template>
