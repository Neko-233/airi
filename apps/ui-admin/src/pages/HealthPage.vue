<script setup lang="ts">
import type { AdminHealthCheck, AdminHealthStatus } from '../modules/api'

import { errorMessageFromUnknown } from '@proj-airi/stage-shared'
import { computed, onMounted, shallowRef } from 'vue'
import { toast } from 'vue-sonner'

import { formatAdminDate, t } from '../modules/admin-locale'
import { adminApi, AdminApiError } from '../modules/api'

const loading = shallowRef(false)
const unavailable = shallowRef<string | null>(null)
const report = shallowRef<Awaited<ReturnType<typeof adminApi.health>> | null>(null)

const checks = computed(() => report.value?.checks ?? [])
const incidents = computed(() => report.value?.incidents ?? [])
const downCount = computed(() => checks.value.filter(check => check.status === 'down').length)
const degradedCount = computed(() => checks.value.filter(check => check.status === 'degraded').length)
const measuredLatency = computed(() => checks.value
  .map(check => check.latencyMs)
  .filter((value): value is number => value != null))
const averageLatency = computed(() => {
  if (measuredLatency.value.length === 0)
    return null

  const total = measuredLatency.value.reduce((sum, value) => sum + value, 0)
  return Math.round(total / measuredLatency.value.length)
})

onMounted(() => {
  void loadHealth()
})

/**
 * Loads the current health report from the admin API.
 */
async function loadHealth() {
  loading.value = true
  unavailable.value = null
  try {
    report.value = await adminApi.health()
  }
  catch (error) {
    report.value = null
    if (error instanceof AdminApiError && error.status === 404) {
      unavailable.value = t('health.unavailable')
      return
    }
    toast.error(errorMessageFromUnknown(error, '加载系统健康状态失败'))
  }
  finally {
    loading.value = false
  }
}

/**
 * Formats the health report timestamp for the page header.
 */
function formatCheckedAt(value: string | null | undefined): string {
  if (!value)
    return t('common.notChecked')

  return formatAdminDate(value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Formats latency values while preserving unavailable measurements.
 */
function formatLatency(value: number | null): string {
  if (value == null)
    return 'n/a'
  return `${value} ms`
}

/**
 * Returns the badge class for a health status.
 */
function statusBadgeClass(status: AdminHealthStatus): string {
  if (status === 'operational')
    return 'badge-green'
  if (status === 'degraded')
    return 'badge-amber'
  if (status === 'down')
    return 'badge-red'
  return 'badge-blue'
}

/**
 * Returns the icon class for a health status.
 */
function statusIcon(status: AdminHealthStatus): string {
  if (status === 'operational')
    return 'i-lucide-check-circle-2'
  if (status === 'degraded')
    return 'i-lucide-alert-triangle'
  if (status === 'down')
    return 'i-lucide-octagon-alert'
  return 'i-lucide-circle-help'
}

/**
 * Groups checks into the operational columns shown on the page.
 */
function checkColumnClass(check: AdminHealthCheck): string {
  if (check.status === 'down')
    return 'health-check-danger'
  if (check.status === 'degraded')
    return 'health-check-warning'
  return 'health-check-normal'
}
</script>

<template>
  <div :class="['space-y-5']">
    <section :class="['page-hero']">
      <div>
        <p :class="['page-kicker']">
          {{ t('health.liveOperations') }}
        </p>
        <h2 :class="['page-title']">
          {{ t('health.title') }}
        </h2>
        <p :class="['page-description']">
          {{ t('health.subtitle') }}
        </p>
      </div>
      <button :class="['btn', 'btn-secondary']" type="button" :disabled="loading" @click="loadHealth">
        <span :class="['i-lucide-refresh-cw', loading ? 'animate-spin' : '']" />
        {{ t('action.refresh') }}
      </button>
    </section>

    <section :class="['grid', 'gap-4', 'md:grid-cols-4']">
      <article :class="['metric-card', 'metric-card-compact']">
        <div :class="['metric-label']">
          {{ t('health.overall') }}
        </div>
        <div :class="['mt-4']">
          <span :class="['badge', statusBadgeClass(report?.status ?? 'unknown')]">
            <span :class="[statusIcon(report?.status ?? 'unknown')]" />
            {{ t(`status.${report?.status ?? 'unknown'}`) }}
          </span>
        </div>
        <div :class="['metric-footnote']">
          {{ formatCheckedAt(report?.checkedAt) }}
        </div>
      </article>
      <article :class="['metric-card', 'metric-card-compact']">
        <div :class="['metric-label']">
          {{ t('health.checks') }}
        </div>
        <div :class="['metric-value']">
          {{ checks.length }}
        </div>
        <div :class="['metric-footnote']">
          {{ t('health.backendDependencies') }}
        </div>
      </article>
      <article :class="['metric-card', 'metric-card-compact']">
        <div :class="['metric-label']">
          {{ t('health.degraded') }}
        </div>
        <div :class="['metric-value']">
          {{ degradedCount + downCount }}
        </div>
        <div :class="['metric-footnote']">
          {{ t('status.down') }} {{ downCount }}
        </div>
      </article>
      <article :class="['metric-card', 'metric-card-compact']">
        <div :class="['metric-label']">
          {{ t('health.avgLatency') }}
        </div>
        <div :class="['metric-value']">
          {{ averageLatency == null ? 'n/a' : `${averageLatency} ms` }}
        </div>
        <div :class="['metric-footnote']">
          {{ t('health.measuredOnly') }}
        </div>
      </article>
    </section>

    <div v-if="loading && !report" :class="['empty-state', 'panel']">
      <span :class="['i-lucide-loader-2', 'animate-spin', 'text-2xl']" />
      {{ t('health.loading') }}
    </div>

    <div v-else-if="unavailable" :class="['empty-state', 'panel']">
      <span :class="['i-lucide-heart-pulse', 'text-2xl']" />
      {{ unavailable }}
    </div>

    <template v-else>
      <section :class="['grid', 'gap-4', 'lg:grid-cols-2']">
        <article
          v-for="check in checks"
          :key="check.id"
          :class="['health-check-card', checkColumnClass(check)]"
        >
          <div :class="['flex', 'items-start', 'justify-between', 'gap-3']">
            <div>
              <h3 :class="['text-sm', 'font-semibold']">
                {{ check.label }}
              </h3>
              <p :class="['mt-1', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ check.detail }}
              </p>
            </div>
            <span :class="['badge', statusBadgeClass(check.status)]">
              <span :class="[statusIcon(check.status)]" />
              {{ t(`status.${check.status}`) }}
            </span>
          </div>
          <div :class="['mt-4', 'grid', 'grid-cols-2', 'gap-3', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            <div>
              <span :class="['block', 'font-semibold', 'text-neutral-900', 'dark:text-neutral-100']">
                {{ formatLatency(check.latencyMs) }}
              </span>
              {{ t('health.latency') }}
            </div>
            <div>
              <span :class="['block', 'font-semibold', 'text-neutral-900', 'dark:text-neutral-100']">
                {{ formatCheckedAt(check.checkedAt) }}
              </span>
              {{ t('health.lastChecked') }}
            </div>
          </div>
        </article>
      </section>

      <section :class="['panel', 'overflow-hidden']">
        <div :class="['panel-toolbar']">
          <div>
            <h3 :class="['panel-title']">
              {{ t('health.incidents') }}
            </h3>
            <p :class="['panel-description']">
              {{ t('health.incidentsDescription') }}
            </p>
          </div>
        </div>

        <div v-if="incidents.length === 0" :class="['empty-state']">
          <span :class="['i-lucide-shield-check', 'text-2xl']" />
          {{ t('health.noActiveIncidents') }}
        </div>

        <table v-else :class="['table']">
          <thead>
            <tr>
              <th>{{ t('health.incident') }}</th>
              <th>{{ t('health.severity') }}</th>
              <th>{{ t('audit.status') }}</th>
              <th>{{ t('health.started') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="incident in incidents" :key="incident.id">
              <td>
                <div :class="['font-medium']">
                  {{ incident.title }}
                </div>
                <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
                  {{ incident.summary }}
                </div>
              </td>
              <td>
                <span :class="['badge', incident.severity === 'critical' ? 'badge-red' : 'badge-amber']">
                  {{ t(`risk.${incident.severity}`) }}
                </span>
              </td>
              <td>{{ t(`status.${incident.status}`) }}</td>
              <td>{{ formatCheckedAt(incident.startedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
