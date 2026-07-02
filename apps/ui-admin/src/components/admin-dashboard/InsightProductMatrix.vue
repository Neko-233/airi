<script setup lang="ts">
import type {
  AdminInsightBreakdown,
  AdminInsightBreakdownItem,
  AdminInsightMetric,
  AdminInsightStatus,
  AdminProductInsights,
} from '../../modules/api'

import { NButton, NEmpty, NTag } from 'naive-ui'
import { computed } from 'vue'

import { formatAdminDate, t } from '../../modules/admin-locale'

const props = defineProps<{
  insights: AdminProductInsights | null
  metricImpact: (metric: AdminInsightMetric) => string | null
}>()

const metrics = computed(() => props.insights?.metrics ?? [])
const breakdowns = computed(() => props.insights?.breakdowns ?? [])

/**
 * Returns the localized label for a known insight metric.
 */
function metricLabel(metric: AdminInsightMetric): string {
  const key = `insights.metric.${metric.id}.label`
  const translated = t(key)
  return translated === key ? metric.label : translated
}

/**
 * Returns the localized description for a known insight metric.
 */
function metricDescription(metric: AdminInsightMetric): string {
  const key = `insights.metric.${metric.id}.description`
  const translated = t(key)
  return translated === key ? metric.description : translated
}

/**
 * Returns the localized label for a known insight breakdown.
 */
function breakdownLabel(breakdown: AdminInsightBreakdown): string {
  const key = `insights.breakdown.${breakdown.id}.label`
  const translated = t(key)
  return translated === key ? breakdown.label : translated
}

/**
 * Returns the localized description for a known insight breakdown.
 */
function breakdownDescription(breakdown: AdminInsightBreakdown): string {
  const key = `insights.breakdown.${breakdown.id}.description`
  const translated = t(key)
  return translated === key ? breakdown.description : translated
}

/**
 * Returns the localized label for a known breakdown row.
 */
function breakdownItemLabel(breakdown: AdminInsightBreakdown, item: AdminInsightBreakdownItem): string {
  const key = `insights.breakdown.${breakdown.id}.item.${item.id}.label`
  const translated = t(key)
  return translated === key ? item.label : translated
}

/**
 * Returns the localized description for a known breakdown row.
 */
function breakdownItemDescription(breakdown: AdminInsightBreakdown, item: AdminInsightBreakdownItem): string {
  const key = `insights.breakdown.${breakdown.id}.item.${item.id}.description`
  const translated = t(key)
  return translated === key ? item.description : translated
}

/**
 * Formats a metric value with its optional unit.
 */
function metricValue(metric: AdminInsightMetric): string {
  return metric.unit ? `${metric.value}${metric.unit === '%' ? '%' : ` ${metric.unit}`}` : String(metric.value)
}

/**
 * Formats a breakdown row value with its optional unit.
 */
function breakdownItemValue(item: AdminInsightBreakdownItem): string {
  return item.unit ? `${item.value} ${item.unit}` : String(item.value)
}

/**
 * Returns operator policy copy for the metric threshold represented by API status.
 */
function metricPolicy(metric: AdminInsightMetric): string {
  const key = `insights.policy.${metric.id}`
  const translated = t(key)
  if (translated !== key)
    return translated

  return metric.status === 'ok' ? t('insights.policy.withinTarget') : t('insights.policy.needsReview')
}

/**
 * Maps insight status to Naive UI tag intent values.
 */
function insightTagType(status: AdminInsightStatus): 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ok')
    return 'success'
  if (status === 'warning')
    return 'warning'
  if (status === 'critical')
    return 'error'
  return 'info'
}

/**
 * Formats insight update timestamps for source footers.
 */
function updatedAt(value: string | null | undefined): string {
  if (!value)
    return t('common.notChecked')

  return t('insights.updatedAt', {
    value: formatAdminDate(value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  })
}
</script>

<template>
  <section class="insight-matrix-panel">
    <header class="insight-matrix-header">
      <div>
        <p>{{ t('insights.posthog') }}</p>
        <h3>{{ t('insights.product') }}</h3>
        <span>{{ t('insights.productDescription') }}</span>
      </div>
      <NButton
        v-if="insights?.dashboardUrl"
        tag="a"
        secondary
        size="small"
        :href="insights.dashboardUrl"
        rel="noreferrer"
        target="_blank"
      >
        {{ t('insights.openPostHog') }}
        <template #icon>
          <span class="i-lucide-arrow-up-right" />
        </template>
      </NButton>
    </header>

    <NEmpty v-if="!insights?.configured" class="insight-matrix-empty" :description="t('insights.configurePostHog')" />
    <NEmpty v-else-if="metrics.length === 0" class="insight-matrix-empty" :description="t('insights.noMetrics')" />
    <template v-else>
      <div class="product-metric-grid">
        <a
          v-for="metric in metrics"
          :key="metric.id"
          class="product-metric-cell"
          :href="metric.href ?? undefined"
          rel="noreferrer"
          target="_blank"
          :title="metricDescription(metric)"
        >
          <span class="product-metric-label">{{ metricLabel(metric) }}</span>
          <strong>{{ metricValue(metric) }}</strong>
          <small>{{ metricPolicy(metric) }}</small>
          <small v-if="metricImpact(metric)" class="product-metric-impact">
            {{ metricImpact(metric) }}
          </small>
          <NTag :bordered="false" size="small" :type="insightTagType(metric.status)">
            {{ t(`status.${metric.status}`) }}
          </NTag>
        </a>
      </div>

      <section v-for="breakdown in breakdowns" :key="breakdown.id" class="insight-row-group">
        <header class="insight-row-group-header">
          <div>
            <h4>{{ breakdownLabel(breakdown) }}</h4>
            <p>{{ breakdownDescription(breakdown) }}</p>
          </div>
          <span>{{ breakdown.items.length }}</span>
        </header>
        <a
          v-for="item in breakdown.items"
          :key="item.id"
          class="insight-detail-row"
          :href="item.href ?? undefined"
          rel="noreferrer"
          target="_blank"
        >
          <span class="insight-detail-main">
            <strong>{{ breakdownItemLabel(breakdown, item) }}</strong>
            <small>{{ breakdownItemDescription(breakdown, item) }}</small>
          </span>
          <span class="insight-detail-side">
            <strong>{{ breakdownItemValue(item) }}</strong>
            <small v-if="item.secondaryValue">{{ item.secondaryValue }}</small>
          </span>
          <NTag :bordered="false" size="small" :type="insightTagType(item.status)">
            {{ t(`status.${item.status}`) }}
          </NTag>
        </a>
      </section>
    </template>

    <footer class="insight-matrix-footer">
      {{ updatedAt(insights?.updatedAt) }}
    </footer>
  </section>
</template>

<style scoped>
.insight-matrix-panel {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.insight-matrix-header {
  align-items: center;
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  min-height: 76px;
  padding: 14px 18px;
}

.insight-matrix-header p {
  color: var(--admin-accent);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.insight-matrix-header h3 {
  font-size: 16px;
  font-weight: 800;
  margin-top: 3px;
}

.insight-matrix-header span {
  color: var(--admin-text-muted);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

.product-metric-grid {
  border-bottom: 1px solid var(--admin-border);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.product-metric-cell {
  border-right: 1px solid var(--admin-border);
  border-bottom: 1px solid var(--admin-border);
  color: inherit;
  display: grid;
  gap: 6px;
  grid-template-rows: auto auto auto auto 1fr;
  min-height: 126px;
  padding: 14px;
  text-decoration: none;
}

.product-metric-cell:nth-child(4n) {
  border-right: 0;
}

.product-metric-cell:hover,
.insight-detail-row:hover {
  background: var(--admin-panel-muted);
}

.product-metric-label {
  color: var(--admin-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.product-metric-cell strong {
  font-size: 24px;
  line-height: 1;
}

.product-metric-cell :deep(.n-tag) {
  align-self: end;
  justify-self: start;
  max-width: 100%;
}

.product-metric-cell small {
  color: var(--admin-text-muted);
  font-size: 11px;
  line-height: 1.25;
}

.product-metric-impact {
  color: #0f766e !important;
}

.insight-row-group {
  border-bottom: 1px solid var(--admin-border);
}

.insight-row-group-header {
  align-items: center;
  background: var(--admin-panel-muted);
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
}

.insight-row-group-header h4 {
  font-size: 13px;
  font-weight: 800;
}

.insight-row-group-header p {
  color: var(--admin-text-muted);
  font-size: 11px;
  margin-top: 3px;
}

.insight-row-group-header > span {
  color: var(--admin-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.insight-detail-row {
  align-items: center;
  border-bottom: 1px solid var(--admin-border);
  color: inherit;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  min-height: 52px;
  padding: 9px 14px;
  text-decoration: none;
}

.insight-detail-row :deep(.n-tag) {
  justify-self: end;
  max-width: 100%;
}

.insight-detail-row:last-child {
  border-bottom: 0;
}

.insight-detail-main,
.insight-detail-side {
  display: grid;
  gap: 3px;
}

.insight-detail-main {
  min-width: 0;
}

.insight-detail-main strong {
  font-size: 13px;
}

.insight-detail-main small,
.insight-detail-side small {
  color: var(--admin-text-muted);
  font-size: 11px;
}

.insight-detail-side {
  justify-items: end;
  min-width: 90px;
}

.insight-detail-side strong {
  font-size: 16px;
}

.insight-matrix-footer {
  color: var(--admin-text-muted);
  font-size: 11px;
  margin-top: auto;
  padding: 10px 14px;
}

.insight-matrix-empty {
  min-height: 220px;
  justify-content: center;
}

@media (max-width: 1300px) {
  .product-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
