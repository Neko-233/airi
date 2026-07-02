<script setup lang="ts">
import type { VoicePack } from '../modules/api'

import { errorMessageFromUnknown } from '@proj-airi/stage-shared'
import { Button } from '@proj-airi/ui'
import { computed, onMounted, shallowRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { formatAdminDate, t } from '../modules/admin-locale'
import { adminApi } from '../modules/api'

const router = useRouter()

const packs = shallowRef<VoicePack[]>([])
const loading = shallowRef(false)

const enabledCount = computed(() => packs.value.filter(pack => pack.enabled).length)
const disabledCount = computed(() => packs.value.length - enabledCount.value)

onMounted(() => {
  void loadPacks()
})

async function loadPacks() {
  loading.value = true
  try {
    packs.value = await adminApi.voicePacks()
  }
  catch (error) {
    toast.error(errorMessageFromUnknown(error, t('voice.failedLoad')))
  }
  finally {
    loading.value = false
  }
}

function formatDate(value: string): string {
  return formatAdminDate(value)
}

function formatMultiplier(value: number): string {
  return `${Number(value.toFixed(2))}x`
}

function editPack(pack: VoicePack) {
  void router.push(`/voice-packs/${encodeURIComponent(pack.id)}/edit`)
}
</script>

<template>
  <section :class="['panel', 'overflow-hidden']">
    <div :class="['flex', 'flex-col', 'gap-3', 'border-b', 'border-neutral-200', 'px-5', 'py-4', 'md:flex-row', 'md:items-center', 'md:justify-between']">
      <div>
        <h2 :class="['text-sm', 'font-semibold']">
          {{ t('voice.title') }}
        </h2>
        <p :class="['mt-1', 'text-sm', 'text-neutral-500']">
          {{ t('voice.description') }}
        </p>
      </div>
      <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2']">
        <span :class="['badge', 'badge-green']">
          <span :class="['i-lucide-volume-2']" />
          {{ t('voice.enabledCount', { count: enabledCount }) }}
        </span>
        <span :class="['badge', disabledCount > 0 ? 'badge-amber' : 'badge-green']">
          <span :class="['i-lucide-circle-slash']" />
          {{ t('voice.disabledCount', { count: disabledCount }) }}
        </span>
        <RouterLink to="/voice-packs/new">
          <Button icon="i-lucide-plus" :label="t('action.new')" size="sm" variant="secondary" />
        </RouterLink>
      </div>
    </div>

    <div v-if="loading && packs.length === 0" :class="['empty-state']">
      <span :class="['i-lucide-loader-2', 'animate-spin', 'text-2xl']" />
      {{ t('voice.loading') }}
    </div>

    <table v-else-if="packs.length > 0" :class="['table']">
      <thead>
        <tr>
          <th>{{ t('voice.name') }}</th>
          <th>{{ t('voice.routing') }}</th>
          <th>{{ t('voice.voice') }}</th>
          <th>{{ t('voice.cost') }}</th>
          <th>{{ t('voice.status') }}</th>
          <th>{{ t('voice.updated') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="pack in packs"
          :key="pack.id"
          :class="['cursor-pointer', 'transition-colors', 'hover:bg-neutral-50']"
          tabindex="0"
          @click="editPack(pack)"
          @keydown.enter.prevent="editPack(pack)"
          @keydown.space.prevent="editPack(pack)"
        >
          <td>
            <div :class="['font-medium']">
              {{ pack.name }}
            </div>
            <div :class="['mt-1', 'max-w-[280px]', 'truncate', 'text-xs', 'text-neutral-500']">
              {{ pack.description || t('voice.noDescription') }}
            </div>
          </td>
          <td>
            <div :class="['text-xs', 'font-mono']">
              {{ pack.ttsModelId }}
            </div>
            <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
              {{ pack.provider }} / {{ pack.model }}
            </div>
          </td>
          <td :class="['text-xs', 'font-mono']">
            {{ pack.voiceId }}
          </td>
          <td>{{ formatMultiplier(pack.costMultiplier) }}</td>
          <td>
            <span :class="['badge', pack.enabled ? 'badge-green' : 'badge-amber']">
              <span :class="[pack.enabled ? 'i-lucide-check-circle-2' : 'i-lucide-pause-circle']" />
              {{ pack.enabled ? t('voice.enabled') : t('voice.disabled') }}
            </span>
          </td>
          <td>{{ formatDate(pack.updatedAt) }}</td>
        </tr>
      </tbody>
    </table>

    <div v-else :class="['empty-state']">
      <span :class="['i-lucide-volume-x', 'text-2xl']" />
      {{ t('voice.noPacks') }}
      <RouterLink to="/voice-packs/new">
        <Button icon="i-lucide-plus" :label="t('action.createVoicePack')" size="sm" variant="secondary" />
      </RouterLink>
    </div>
  </section>
</template>
