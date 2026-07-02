<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'

import type { AdminHealthCheck, AdminHealthReport, AdminHealthStatus } from '../../modules/api'

import { NButton, NDataTable, NEmpty, NTag } from 'naive-ui'
import { computed, h } from 'vue'
import { RouterLink } from 'vue-router'

import { formatAdminDate, t } from '../../modules/admin-locale'

const props = defineProps<{
  degradedCount: number
  health: AdminHealthReport | null
  rows: AdminHealthCheck[]
  unavailable: boolean
}>()

const openIncidentCount = computed(() => props.health?.incidents.filter(incident => incident.status !== 'resolved').length ?? 0)
const healthStatus = computed(() => props.health?.status ?? 'unknown')
const columns = computed<DataTableColumns<AdminHealthCheck>>(() => [
  {
    key: 'label',
    minWidth: 260,
    title: t('health.checks'),
    render: check => h('div', { class: 'operations-check' }, [
      h('strong', check.label),
      h('small', check.detail),
    ]),
  },
  {
    key: 'status',
    title: t('health.status'),
    width: 110,
    render: check => h(NTag, {
      bordered: false,
      size: 'small',
      type: healthTagType(check.status),
    }, {
      default: () => t(`status.${check.status}`),
    }),
  },
  {
    key: 'latency',
    title: t('health.latency'),
    width: 120,
    render: check => formatLatency(check.latencyMs),
  },
  {
    key: 'checkedAt',
    minWidth: 160,
    title: t('health.lastChecked'),
    render: check => formatOptionalDateTime(check.checkedAt),
  },
])

/**
 * Maps health status to Naive UI tag intent values.
 */
function healthTagType(status: AdminHealthStatus): 'success' | 'warning' | 'error' | 'info' {
  if (status === 'operational')
    return 'success'
  if (status === 'degraded')
    return 'warning'
  if (status === 'down')
    return 'error'
  return 'info'
}

/**
 * Formats optional latency measurements for dense health tables.
 */
function formatLatency(value: number | null): string {
  if (value == null)
    return 'n/a'
  return `${value} ms`
}

/**
 * Formats optional timestamps while preserving unchecked states.
 */
function formatOptionalDateTime(value: string | null): string {
  if (!value)
    return t('common.notChecked')

  return formatAdminDate(value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Returns row tone classes for dependencies requiring attention.
 */
function rowClassName(row: AdminHealthCheck): string {
  if (row.status === 'down')
    return 'operations-row-danger'
  if (row.status === 'degraded')
    return 'operations-row-warning'
  return ''
}
</script>

<template>
  <section class="operations-panel">
    <header class="operations-panel-header">
      <div>
        <p class="operations-eyebrow">
          {{ t('overview.systemReadiness') }}
        </p>
        <h3>{{ t('health.backendDependencies') }}</h3>
      </div>
      <NTag :bordered="false" :type="healthTagType(healthStatus)">
        {{ t(`status.${healthStatus}`) }}
      </NTag>
    </header>

    <div class="operations-summary">
      <div>
        <span>{{ t('overview.openIncidents') }}</span>
        <strong>{{ openIncidentCount }}</strong>
      </div>
      <div>
        <span>{{ t('health.degraded') }}</span>
        <strong>{{ degradedCount }}</strong>
      </div>
      <RouterLink v-slot="{ navigate }" custom to="/health">
        <NButton quaternary size="small" type="primary" @click="navigate">
          {{ t('action.openHealth') }}
          <template #icon>
            <span class="i-lucide-arrow-right" />
          </template>
        </NButton>
      </RouterLink>
    </div>

    <NEmpty v-if="unavailable" class="operations-empty" :description="t('health.unavailable')" />
    <NEmpty v-else-if="rows.length === 0" class="operations-empty" :description="t('overview.noDegradedChecks')" />
    <NDataTable
      v-else
      :bordered="false"
      :columns="columns"
      :data="rows"
      :pagination="false"
      :row-class-name="rowClassName"
      size="small"
    />
  </section>
</template>

<style scoped>
.operations-panel {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.operations-panel-header {
  align-items: center;
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  min-height: 68px;
  padding: 14px 18px;
}

.operations-panel-header h3 {
  font-size: 15px;
  font-weight: 750;
}

.operations-eyebrow {
  color: var(--admin-accent);
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.operations-summary {
  align-items: center;
  background: var(--admin-panel-muted);
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  gap: 28px;
  min-height: 54px;
  padding: 8px 18px;
}

.operations-summary span {
  color: var(--admin-text-muted);
  display: block;
  font-size: 11px;
  font-weight: 700;
}

.operations-summary strong {
  display: block;
  font-size: 19px;
  line-height: 1;
  margin-top: 4px;
}

.operations-summary :deep(.n-button) {
  margin-left: auto;
}

:deep(.operations-check) {
  display: grid;
  gap: 3px;
}

:deep(.operations-check strong) {
  font-size: 13px;
  line-height: 1.25;
}

:deep(.operations-check small) {
  color: var(--admin-text-muted);
  font-size: 11px;
  line-height: 1.35;
}

:deep(.operations-row-warning .n-data-table-td) {
  background: rgba(245, 158, 11, 0.07);
}

:deep(.operations-row-danger .n-data-table-td) {
  background: rgba(239, 68, 68, 0.08);
}

.operations-empty {
  min-height: 260px;
  justify-content: center;
}
</style>
