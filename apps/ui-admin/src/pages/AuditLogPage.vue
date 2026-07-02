<script setup lang="ts">
import type { AdminAuditLogEntry, AdminAuditLogRisk, AdminAuditLogStatus } from '../modules/api'

import { errorMessageFromUnknown } from '@proj-airi/stage-shared'
import { computed, onMounted, shallowRef } from 'vue'
import { toast } from 'vue-sonner'

import { formatAdminDate, t } from '../modules/admin-locale'
import { adminApi, AdminApiError } from '../modules/api'

const logs = shallowRef<AdminAuditLogEntry[]>([])
const loading = shallowRef(false)
const unavailable = shallowRef<string | null>(null)
const riskFilter = shallowRef('all')
const statusFilter = shallowRef('all')
const totalLogs = shallowRef(0)
const pageSize = 50

const riskOptions = computed(() => [
  { label: t('audit.allRisk'), value: 'all' },
  { label: t('risk.critical'), value: 'critical' },
  { label: t('risk.high'), value: 'high' },
  { label: t('risk.medium'), value: 'medium' },
  { label: t('risk.low'), value: 'low' },
])
const statusOptions = computed(() => [
  { label: t('audit.allStatus'), value: 'all' },
  { label: t('status.success'), value: 'success' },
  { label: t('status.failed'), value: 'failed' },
  { label: t('status.pending'), value: 'pending' },
])
const criticalCount = computed(() => logs.value.filter(log => log.risk === 'critical').length)
const failedCount = computed(() => logs.value.filter(log => log.status === 'failed').length)
const highImpactCount = computed(() => logs.value.filter(log => log.risk === 'critical' || log.risk === 'high').length)

onMounted(() => {
  void loadAuditLogs()
})

/**
 * Loads the current audit log page from the admin API.
 */
async function loadAuditLogs() {
  loading.value = true
  unavailable.value = null
  try {
    const result = await adminApi.auditLogs({
      limit: pageSize,
      offset: 0,
      risk: riskFilter.value === 'all' ? undefined : riskFilter.value,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    })
    logs.value = result.logs
    totalLogs.value = result.total
  }
  catch (error) {
    logs.value = []
    totalLogs.value = 0
    if (error instanceof AdminApiError && error.status === 404) {
      unavailable.value = t('audit.unavailable')
      return
    }
    toast.error(errorMessageFromUnknown(error, '加载审计日志失败'))
  }
  finally {
    loading.value = false
  }
}

/**
 * Updates a filter and reloads the audit table.
 */
function setFilter(kind: 'risk' | 'status', value: string) {
  if (kind === 'risk')
    riskFilter.value = value
  else
    statusFilter.value = value
  void loadAuditLogs()
}

/**
 * Reads select changes and applies the matching audit filter.
 */
function setSelectFilter(kind: 'risk' | 'status', event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement))
    return

  setFilter(kind, target.value)
}

/**
 * Formats an ISO timestamp for compact operator tables.
 */
function formatDateTime(value: string): string {
  return formatAdminDate(value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Returns the badge class for an audit risk tier.
 */
function riskBadgeClass(risk: AdminAuditLogRisk): string {
  if (risk === 'critical')
    return 'badge-red'
  if (risk === 'high')
    return 'badge-amber'
  if (risk === 'medium')
    return 'badge-blue'
  return 'badge-green'
}

/**
 * Returns the badge class for an audit execution status.
 */
function statusBadgeClass(status: AdminAuditLogStatus): string {
  if (status === 'failed')
    return 'badge-red'
  if (status === 'pending')
    return 'badge-amber'
  return 'badge-green'
}
</script>

<template>
  <div :class="['space-y-5']">
    <section :class="['page-hero']">
      <div>
        <p :class="['page-kicker']">
          {{ t('audit.trail') }}
        </p>
        <h2 :class="['page-title']">
          {{ t('audit.title') }}
        </h2>
        <p :class="['page-description']">
          {{ t('audit.reviewDescription') }}
        </p>
      </div>
      <button :class="['btn', 'btn-secondary']" type="button" :disabled="loading" @click="loadAuditLogs">
        <span :class="['i-lucide-refresh-cw', loading ? 'animate-spin' : '']" />
        {{ t('action.refresh') }}
      </button>
    </section>

    <section :class="['grid', 'gap-4', 'md:grid-cols-3']">
      <article :class="['metric-card', 'metric-card-compact']">
        <div :class="['metric-label']">
          {{ t('audit.events') }}
        </div>
        <div :class="['metric-value']">
          {{ totalLogs }}
        </div>
        <div :class="['metric-footnote']">
          {{ t('audit.matchingFilters') }}
        </div>
      </article>
      <article :class="['metric-card', 'metric-card-compact']">
        <div :class="['metric-label']">
          {{ t('audit.highImpact') }}
        </div>
        <div :class="['metric-value']">
          {{ highImpactCount }}
        </div>
        <div :class="['metric-footnote']">
          {{ t('audit.criticalEventsVisible', { count: criticalCount }) }}
        </div>
      </article>
      <article :class="['metric-card', 'metric-card-compact']">
        <div :class="['metric-label']">
          {{ t('audit.failed') }}
        </div>
        <div :class="['metric-value']">
          {{ failedCount }}
        </div>
        <div :class="['metric-footnote']">
          {{ t('audit.needsReview') }}
        </div>
      </article>
    </section>

    <section :class="['panel', 'overflow-hidden']">
      <div :class="['panel-toolbar']">
        <div>
          <h3 :class="['panel-title']">
            {{ t('audit.recentActions') }}
          </h3>
          <p :class="['panel-description']">
            {{ t('audit.recentDescription', { count: pageSize }) }}
            <span v-if="criticalCount > 0">{{ t('audit.criticalEventsVisible', { count: criticalCount }) }}</span>
          </p>
        </div>
        <div :class="['flex', 'flex-wrap', 'gap-2']">
          <select :class="['field', 'w-auto']" :value="riskFilter" @change="setSelectFilter('risk', $event)">
            <option v-for="option in riskOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select :class="['field', 'w-auto']" :value="statusFilter" @change="setSelectFilter('status', $event)">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="loading && logs.length === 0" :class="['empty-state']">
        <span :class="['i-lucide-loader-2', 'animate-spin', 'text-2xl']" />
        {{ t('audit.loading') }}
      </div>

      <div v-else-if="unavailable" :class="['empty-state']">
        <span :class="['i-lucide-file-clock', 'text-2xl']" />
        {{ unavailable }}
      </div>

      <table v-else-if="logs.length > 0" :class="['table']">
        <thead>
          <tr>
            <th>{{ t('audit.recentActions') }}</th>
            <th>{{ t('audit.actor') }}</th>
            <th>{{ t('audit.target') }}</th>
            <th>{{ t('audit.risk') }}</th>
            <th>{{ t('audit.status') }}</th>
            <th>{{ t('audit.time') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>
              <div :class="['font-medium']">
                {{ log.summary }}
              </div>
              <div :class="['mt-1', 'font-mono', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ log.action }}
              </div>
            </td>
            <td>
              <div :class="['font-medium']">
                {{ log.actor?.name ?? t('common.system') }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ log.actor?.email ?? t('audit.automatedTask') }}
              </div>
            </td>
            <td>
              <div :class="['font-medium']">
                {{ log.targetLabel ?? log.targetType }}
              </div>
              <div :class="['mt-1', 'font-mono', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ log.targetId ?? log.targetType }}
              </div>
            </td>
            <td>
              <span :class="['badge', riskBadgeClass(log.risk)]">
                {{ t(`risk.${log.risk}`) }}
              </span>
            </td>
            <td>
              <span :class="['badge', statusBadgeClass(log.status)]">
                {{ t(`status.${log.status}`) }}
              </span>
            </td>
            <td>{{ formatDateTime(log.createdAt) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else :class="['empty-state']">
        <span :class="['i-lucide-search-x', 'text-2xl']" />
        {{ t('audit.empty') }}
      </div>
    </section>
  </div>
</template>
