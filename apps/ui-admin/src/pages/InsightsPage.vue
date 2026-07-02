<script setup lang="ts">
import type {
  AdminInsightBreakdownItem,
  AdminInsightMetric,
  AdminInsightStatus,
  AdminProductInsights,
  AdminReliabilityInsights,
} from '../modules/api'

import { errorMessageFromUnknown } from '@proj-airi/stage-shared'
import { NButton, NSpin } from 'naive-ui'
import { computed, onMounted, shallowRef } from 'vue'
import { toast } from 'vue-sonner'

import InsightAttentionRail from '../components/admin-dashboard/InsightAttentionRail.vue'
import InsightProductMatrix from '../components/admin-dashboard/InsightProductMatrix.vue'
import InsightReliabilityMatrix from '../components/admin-dashboard/InsightReliabilityMatrix.vue'
import InsightSourceStrip from '../components/admin-dashboard/InsightSourceStrip.vue'
import InsightSummaryStrip from '../components/admin-dashboard/InsightSummaryStrip.vue'

import { formatAdminDate, t } from '../modules/admin-locale'
import { adminApi } from '../modules/api'

interface InsightSourceSignal {
  detail: string
  icon: string
  id: string
  label: string
  status: AdminInsightStatus
  value: string
}

interface InsightSummarySignal {
  detail: string
  icon: string
  id: string
  label: string
  status: AdminInsightStatus
  value: string
}

const productMetricImpactItemIds: Record<string, string> = {
  activation_failed_7d: 'chat_activation_failed',
  activation_started_7d: 'chat_activation_started',
  activation_success_rate_7d: 'chat_activation_succeeded',
  mic_denied_7d: 'microphone_permission_denied',
  provider_config_failed_7d: 'provider_config_failed',
  tts_provider_selected_7d: 'tts_provider_selected',
  voice_input_started_7d: 'voice_input_started',
  voice_selected_7d: 'voice_selected',
}

const loading = shallowRef(true)
const productInsights = shallowRef<AdminProductInsights | null>(null)
const reliabilityInsights = shallowRef<AdminReliabilityInsights | null>(null)

const productMetrics = computed(() => productInsights.value?.metrics ?? [])
const reliabilityMetrics = computed(() => reliabilityInsights.value?.metrics ?? [])
const productBreakdowns = computed(() => productInsights.value?.breakdowns ?? [])
const alertRules = computed(() => reliabilityInsights.value?.alertRules ?? [])
const attentionMetrics = computed(() => [
  ...productMetrics.value,
  ...reliabilityMetrics.value,
].filter(metric => metric.status === 'warning' || metric.status === 'critical'))
const pausedRuleCount = computed(() => alertRules.value.filter(rule => rule.state === 'paused').length)
const activeRuleCount = computed(() => alertRules.value.filter(rule => rule.state === 'active').length)
const activationHealthMetric = computed(() => productMetrics.value.find(metric => metric.id === 'activation_success_rate_7d') ?? null)
const providerBlockerMetric = computed(() => productMetrics.value.find(metric => metric.id === 'provider_config_failed_7d') ?? null)
const alertCoverageMetric = computed(() => reliabilityMetrics.value.find(metric => metric.id === 'grafana_alert_rules') ?? null)
const productBreakdownItemById = computed(() => {
  const items = new Map<string, AdminInsightBreakdownItem>()
  productBreakdowns.value.forEach((breakdown) => {
    breakdown.items.forEach(item => items.set(item.id, item))
  })
  return items
})
const sourceSignals = computed<InsightSourceSignal[]>(() => [
  {
    id: 'window',
    label: t('insights.signal.window'),
    value: productInsights.value?.windowDays
      ? t('insights.signal.days', { count: String(productInsights.value.windowDays) })
      : t('common.notChecked'),
    detail: t('insights.signal.windowDetail'),
    status: productInsights.value?.configured ? 'ok' : 'unknown',
    icon: 'i-lucide-calendar-range',
  },
  {
    id: 'posthogFreshness',
    label: t('insights.signal.posthogFreshness'),
    value: compactUpdatedAt(productInsights.value?.updatedAt),
    detail: productInsights.value?.configured ? t('insights.signal.sourceLive') : t('insights.notConfigured'),
    status: productInsights.value?.errorMessage ? 'warning' : productInsights.value?.configured ? 'ok' : 'unknown',
    icon: 'i-lucide-chart-no-axes-combined',
  },
  {
    id: 'grafanaFreshness',
    label: t('insights.signal.grafanaFreshness'),
    value: compactUpdatedAt(reliabilityInsights.value?.updatedAt),
    detail: reliabilityInsights.value?.configured ? t('insights.signal.sourceLive') : t('insights.notConfigured'),
    status: reliabilityInsights.value?.errorMessage ? 'warning' : reliabilityInsights.value?.configured ? 'ok' : 'unknown',
    icon: 'i-lucide-activity',
  },
  {
    id: 'attention',
    label: t('insights.signal.attention'),
    value: t('insights.signal.attentionValue', { count: String(attentionMetrics.value.length) }),
    detail: t('insights.summary.alertCoverageDetail', {
      active: String(activeRuleCount.value),
      paused: String(pausedRuleCount.value),
    }),
    status: attentionMetrics.value.some(metric => metric.status === 'critical') ? 'critical' : attentionMetrics.value.length > 0 ? 'warning' : 'ok',
    icon: 'i-lucide-shield-alert',
  },
])
const summarySignals = computed<InsightSummarySignal[]>(() => [
  {
    id: 'operatorPressure',
    label: t('insights.summary.operatorPressure'),
    value: String(attentionMetrics.value.length),
    detail: t('insights.summary.operatorPressureDetail'),
    status: attentionMetrics.value.some(metric => metric.status === 'critical') ? 'critical' : attentionMetrics.value.length > 0 ? 'warning' : 'ok',
    icon: 'i-lucide-goal',
  },
  {
    id: 'activationHealth',
    label: t('insights.summary.activationHealth'),
    value: metricValue(activationHealthMetric.value),
    detail: metricDescription(activationHealthMetric.value),
    status: activationHealthMetric.value?.status ?? 'unknown',
    icon: 'i-lucide-route',
  },
  {
    id: 'providerBlockers',
    label: t('insights.summary.providerBlockers'),
    value: metricValue(providerBlockerMetric.value),
    detail: metricDescription(providerBlockerMetric.value),
    status: providerBlockerMetric.value?.status ?? 'unknown',
    icon: 'i-lucide-unplug',
  },
  {
    id: 'alertCoverage',
    label: t('insights.summary.alertCoverage'),
    value: metricValue(alertCoverageMetric.value),
    detail: t('insights.summary.alertCoverageDetail', {
      active: String(activeRuleCount.value),
      paused: String(pausedRuleCount.value),
    }),
    status: alertCoverageMetric.value?.status ?? 'unknown',
    icon: 'i-lucide-bell',
  },
])

onMounted(async () => {
  await refreshInsights()
})

/**
 * Refreshes both external insight providers without letting one failure hide the other.
 */
async function refreshInsights() {
  loading.value = true
  await Promise.all([
    loadProductInsights(),
    loadReliabilityInsights(),
  ])
  loading.value = false
}

/**
 * Loads PostHog product analytics through the admin API proxy.
 */
async function loadProductInsights() {
  try {
    productInsights.value = await adminApi.productInsights()
  }
  catch (error) {
    productInsights.value = null
    toast.error(errorMessageFromUnknown(error, '加载 PostHog 洞察失败'))
  }
}

/**
 * Loads Grafana reliability signals through the admin API proxy.
 */
async function loadReliabilityInsights() {
  try {
    reliabilityInsights.value = await adminApi.reliabilityInsights()
  }
  catch (error) {
    reliabilityInsights.value = null
    toast.error(errorMessageFromUnknown(error, '加载 Grafana 洞察失败'))
  }
}

/**
 * Formats an insight response timestamp for dense source metadata.
 */
function compactUpdatedAt(value: string | null | undefined): string {
  if (!value)
    return t('common.notChecked')

  return formatAdminDate(value, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * Formats a summary metric value while preserving unknown states.
 */
function metricValue(metric: AdminInsightMetric | null): string {
  if (!metric)
    return t('common.notChecked')

  return metric.unit ? `${metric.value}${metric.unit === '%' ? '%' : ` ${metric.unit}`}` : String(metric.value)
}

/**
 * Returns localized metric descriptions for summary strip cells.
 */
function metricDescription(metric: AdminInsightMetric | null): string {
  if (!metric)
    return t('common.notChecked')

  const key = `insights.metric.${metric.id}.description`
  const translated = t(key)
  return translated === key ? metric.description : translated
}

/**
 * Returns a concise product impact line from the matching PostHog rollup row.
 */
function metricImpact(metric: AdminInsightMetric): string | null {
  const itemId = productMetricImpactItemIds[metric.id]
  if (!itemId)
    return null

  return productBreakdownItemById.value.get(itemId)?.secondaryValue ?? null
}
</script>

<template>
  <div class="insights-console">
    <section class="insights-console-header">
      <div class="insights-console-copy">
        <p>{{ t('nav.insightsDescription') }}</p>
        <h2>{{ t('insights.title') }}</h2>
        <span>{{ t('insights.subtitle') }}</span>
      </div>
      <NButton secondary type="default" :disabled="loading" @click="refreshInsights">
        <template #icon>
          <span :class="['i-lucide-refresh-cw', loading ? 'animate-spin' : '']" />
        </template>
        {{ t('action.refresh') }}
      </NButton>
    </section>

    <div v-if="loading" class="insights-loading">
      <NSpin>
        <template #description>
          {{ t('insights.loading') }}
        </template>
      </NSpin>
    </div>

    <template v-else>
      <InsightSourceStrip :signals="sourceSignals" />
      <InsightSummaryStrip :signals="summarySignals" />

      <section class="insights-console-workbench">
        <InsightAttentionRail :metrics="attentionMetrics" />
        <div class="insights-console-panels">
          <InsightProductMatrix
            :insights="productInsights"
            :metric-impact="metricImpact"
          />
          <InsightReliabilityMatrix :insights="reliabilityInsights" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.insights-console {
  display: grid;
  gap: 14px;
  min-height: 0;
}

.insights-console-header {
  align-items: flex-start;
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  gap: 20px;
  justify-content: space-between;
  padding-bottom: 14px;
}

.insights-console-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.insights-console-copy p {
  color: var(--admin-accent);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.insights-console-copy h2 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.2;
}

.insights-console-copy span {
  color: var(--admin-text-muted);
  font-size: 13px;
  line-height: 1.5;
  max-width: 760px;
}

.insights-loading {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  display: grid;
  min-height: 260px;
  place-items: center;
}

.insights-console-workbench {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr);
  min-height: 0;
}

.insights-console-panels {
  align-items: stretch;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1.24fr) minmax(360px, 0.76fr);
  min-width: 0;
}

@media (max-width: 1180px) {
  .insights-console-panels {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
