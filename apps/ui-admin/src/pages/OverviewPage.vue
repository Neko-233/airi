<script setup lang="ts">
import type { AdminAuditLogEntry, AdminHealthReport, AdminMetrics } from '../modules/api'

import { errorMessageFromUnknown } from '@proj-airi/stage-shared'
import { NButton } from 'naive-ui'
import { computed, onMounted, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'

import OverviewCommandRail from '../components/admin-dashboard/OverviewCommandRail.vue'
import OverviewOperationsTable from '../components/admin-dashboard/OverviewOperationsTable.vue'
import OverviewRiskTimeline from '../components/admin-dashboard/OverviewRiskTimeline.vue'
import OverviewStatusStrip from '../components/admin-dashboard/OverviewStatusStrip.vue'

import { formatAdminNumber, t } from '../modules/admin-locale'
import { adminApi, AdminApiError } from '../modules/api'

const loading = shallowRef(true)
const metrics = shallowRef<AdminMetrics | null>(null)
const health = shallowRef<AdminHealthReport | null>(null)
const auditLogs = shallowRef<AdminAuditLogEntry[]>([])
const healthUnavailable = shallowRef(false)
const auditUnavailable = shallowRef(false)

const statusItems = computed(() => {
  const data = metrics.value
  return [
    {
      label: t('overview.totalUsers'),
      value: formatNumber(data?.totalUsers),
      detail: t('overview.verified', { value: formatNumber(data?.verifiedUsers) }),
      icon: 'i-lucide-users',
    },
    {
      label: t('overview.activeSessions'),
      value: formatNumber(data?.activeSessions),
      detail: t('overview.betterAuthRows'),
      icon: 'i-lucide-activity',
    },
    {
      label: t('overview.currentFlux'),
      value: formatNumber(data?.currentFlux),
      detail: t('overview.issuedLifetime', { value: formatNumber(data?.issuedFlux) }),
      icon: 'i-lucide-coins',
    },
    {
      label: t('overview.llm24h'),
      value: formatNumber(data?.llmRequests24h),
      detail: t('overview.fluxConsumed', { value: formatNumber(data?.llmFlux24h) }),
      icon: 'i-lucide-bot',
    },
  ]
})
const healthChecks = computed(() => health.value?.checks ?? [])
const degradedChecks = computed(() => healthChecks.value.filter(check => check.status === 'degraded' || check.status === 'down'))
const healthRows = computed(() => [
  ...degradedChecks.value,
  ...healthChecks.value.filter(check => check.status !== 'degraded' && check.status !== 'down'),
].slice(0, 6))
const criticalAuditLogs = computed(() => auditLogs.value.filter(log => log.risk === 'critical' || log.risk === 'high').slice(0, 5))
const commandLinks = computed(() => [
  {
    to: '/flux',
    icon: 'i-lucide-coins',
    tone: 'text-emerald-600',
    title: t('overview.fluxGrants'),
    description: t('overview.fluxGrantsDescription'),
  },
  {
    to: '/llm-router',
    icon: 'i-lucide-route',
    tone: 'text-sky-600',
    title: t('overview.llmRouter'),
    description: t('overview.llmRouterDescription'),
  },
  {
    to: '/voice-packs',
    icon: 'i-lucide-volume-2',
    tone: 'text-amber-600',
    title: t('overview.voicePacks'),
    description: t('overview.voicePacksDescription'),
  },
  {
    to: '/insights',
    icon: 'i-lucide-chart-no-axes-combined',
    tone: 'text-indigo-600',
    title: t('overview.insights'),
    description: t('overview.insightsDescription'),
  },
  {
    to: '/users',
    icon: 'i-lucide-users',
    tone: 'text-neutral-700 dark:text-neutral-200',
    title: t('overview.userSupport'),
    description: t('overview.userSupportDescription'),
  },
])

onMounted(async () => {
  await Promise.all([
    loadMetrics(),
    loadHealthSummary(),
    loadAuditSummary(),
  ])
  loading.value = false
})

/**
 * Loads the primary dashboard metrics.
 */
async function loadMetrics() {
  try {
    metrics.value = await adminApi.metrics()
  }
  catch (error) {
    toast.error(errorMessageFromUnknown(error, '加载总览指标失败'))
  }
}

/**
 * Loads optional health data for the operations summary.
 */
async function loadHealthSummary() {
  try {
    health.value = await adminApi.health()
    healthUnavailable.value = false
  }
  catch (error) {
    health.value = null
    healthUnavailable.value = error instanceof AdminApiError && error.status === 404
    if (!healthUnavailable.value)
      toast.error(errorMessageFromUnknown(error, '加载健康摘要失败'))
  }
}

/**
 * Loads optional audit data for the recent actions panel.
 */
async function loadAuditSummary() {
  try {
    const result = await adminApi.auditLogs({ limit: 6, offset: 0 })
    auditLogs.value = result.logs
    auditUnavailable.value = false
  }
  catch (error) {
    auditLogs.value = []
    auditUnavailable.value = error instanceof AdminApiError && error.status === 404
    if (!auditUnavailable.value)
      toast.error(errorMessageFromUnknown(error, '加载最近审计事件失败'))
  }
}

/**
 * Formats a number for dashboard counters.
 */
function formatNumber(value: number | null | undefined): string {
  if (value == null)
    return loading.value ? '...' : '0'
  return formatAdminNumber(value)
}
</script>

<template>
  <div class="overview-console">
    <section class="overview-console-header">
      <div class="overview-console-copy">
        <p>{{ t('overview.operationsCommand') }}</p>
        <h2>{{ t('overview.adminOverview') }}</h2>
        <span>{{ t('overview.monitorDescription') }}</span>
      </div>
      <div class="overview-console-actions">
        <RouterLink v-slot="{ navigate }" custom to="/audit-log">
          <NButton secondary @click="navigate">
            <template #icon>
              <span class="i-lucide-file-clock" />
            </template>
            {{ t('action.auditLog') }}
          </NButton>
        </RouterLink>
        <RouterLink v-slot="{ navigate }" custom to="/health">
          <NButton type="primary" @click="navigate">
            <template #icon>
              <span class="i-lucide-heart-pulse" />
            </template>
            {{ t('action.health') }}
          </NButton>
        </RouterLink>
      </div>
    </section>

    <OverviewStatusStrip :items="statusItems" />

    <section class="overview-console-workbench">
      <OverviewOperationsTable
        :degraded-count="degradedChecks.length"
        :health="health"
        :rows="healthRows"
        :unavailable="healthUnavailable"
      />
      <OverviewRiskTimeline
        :logs="criticalAuditLogs"
        :unavailable="auditUnavailable"
      />
    </section>

    <OverviewCommandRail :links="commandLinks" />
  </div>
</template>

<style scoped>
.overview-console {
  display: grid;
  gap: 14px;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
}

.overview-console-header {
  align-items: flex-start;
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  gap: 20px;
  justify-content: space-between;
  padding-bottom: 14px;
}

.overview-console-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.overview-console-copy p {
  color: var(--admin-accent);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.overview-console-copy h2 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.2;
}

.overview-console-copy span {
  color: var(--admin-text-muted);
  font-size: 13px;
  line-height: 1.5;
  max-width: 760px;
}

.overview-console-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.overview-console-workbench {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  min-height: 0;
}

@media (max-width: 1180px) {
  .overview-console {
    height: auto;
  }

  .overview-console-workbench {
    grid-template-columns: 1fr;
  }
}
</style>
