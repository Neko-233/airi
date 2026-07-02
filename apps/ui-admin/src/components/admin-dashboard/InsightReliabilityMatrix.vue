<script setup lang="ts">
import type {
  AdminInsightBreakdown,
  AdminInsightBreakdownItem,
  AdminInsightMetric,
  AdminInsightStatus,
  AdminReliabilityAlertRule,
  AdminReliabilityInsights,
} from '../../modules/api'

import { NButton, NEmpty, NTag } from 'naive-ui'
import { computed } from 'vue'

import { formatAdminDate, t } from '../../modules/admin-locale'

const props = defineProps<{
  insights: AdminReliabilityInsights | null
}>()

const metrics = computed(() => props.insights?.metrics ?? [])
const breakdowns = computed(() => props.insights?.breakdowns ?? [])
const alertRules = computed(() => props.insights?.alertRules ?? [])

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
 * Maps alert rule state to Naive UI tag intent values.
 */
function alertRuleTagType(rule: AdminReliabilityAlertRule): 'success' | 'warning' | 'info' {
  if (rule.state === 'paused')
    return 'warning'
  if (rule.state === 'active')
    return 'success'
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
  <section class="reliability-panel">
    <header class="reliability-header">
      <div>
        <p>{{ t('insights.grafana') }}</p>
        <h3>{{ t('insights.reliability') }}</h3>
        <span>{{ t('insights.reliabilityDescription') }}</span>
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
        {{ t('insights.openGrafana') }}
        <template #icon>
          <span class="i-lucide-arrow-up-right" />
        </template>
      </NButton>
    </header>

    <NEmpty v-if="!insights?.configured" class="reliability-empty" :description="t('insights.configureGrafana')" />
    <NEmpty v-else-if="metrics.length === 0" class="reliability-empty" :description="t('insights.noMetrics')" />
    <template v-else>
      <div class="reliability-metrics">
        <a
          v-for="metric in metrics"
          :key="metric.id"
          class="reliability-metric"
          :href="metric.href ?? undefined"
          rel="noreferrer"
          target="_blank"
          :title="metricDescription(metric)"
        >
          <span>{{ metricLabel(metric) }}</span>
          <strong>{{ metricValue(metric) }}</strong>
          <NTag :bordered="false" size="small" :type="insightTagType(metric.status)">
            {{ t(`status.${metric.status}`) }}
          </NTag>
        </a>
      </div>

      <section v-for="breakdown in breakdowns" :key="breakdown.id" class="reliability-group">
        <header class="reliability-group-header">
          <div>
            <h4>{{ breakdownLabel(breakdown) }}</h4>
            <p>{{ breakdownDescription(breakdown) }}</p>
          </div>
          <span>{{ breakdown.items.length }}</span>
        </header>
        <a
          v-for="item in breakdown.items"
          :key="item.id"
          class="reliability-row"
          :href="item.href ?? undefined"
          rel="noreferrer"
          target="_blank"
        >
          <span class="reliability-row-main">
            <strong>{{ breakdownItemLabel(breakdown, item) }}</strong>
            <small>{{ item.description }}</small>
          </span>
          <span class="reliability-row-side">
            <strong>{{ breakdownItemValue(item) }}</strong>
            <small v-if="item.secondaryValue">{{ item.secondaryValue }}</small>
          </span>
        </a>
      </section>

      <section class="reliability-group">
        <header class="reliability-group-header">
          <div>
            <h4>{{ t('insights.alertRules') }}</h4>
            <p>{{ t('insights.reliabilityDescription') }}</p>
          </div>
          <span>{{ alertRules.length }}</span>
        </header>
        <NEmpty v-if="alertRules.length === 0" class="reliability-empty-small" :description="t('insights.noAlerts')" />
        <a
          v-for="rule in alertRules"
          :key="rule.id"
          class="reliability-row"
          :href="rule.href ?? undefined"
          rel="noreferrer"
          target="_blank"
        >
          <span class="reliability-row-main">
            <strong>{{ rule.name }}</strong>
            <small>{{ rule.folder ?? t('common.system') }}</small>
          </span>
          <NTag :bordered="false" size="small" :type="alertRuleTagType(rule)">
            {{ rule.state ?? t('status.unknown') }}
          </NTag>
        </a>
      </section>
    </template>

    <footer class="reliability-footer">
      {{ updatedAt(insights?.updatedAt) }}
    </footer>
  </section>
</template>

<style scoped>
.reliability-panel {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.reliability-header {
  align-items: center;
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  min-height: 76px;
  padding: 14px 18px;
}

.reliability-header p {
  color: var(--admin-accent);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.reliability-header h3 {
  font-size: 16px;
  font-weight: 800;
  margin-top: 3px;
}

.reliability-header span {
  color: var(--admin-text-muted);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

.reliability-metrics {
  border-bottom: 1px solid var(--admin-border);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.reliability-metric {
  border-right: 1px solid var(--admin-border);
  border-bottom: 1px solid var(--admin-border);
  color: inherit;
  display: grid;
  gap: 7px;
  grid-template-rows: auto auto 1fr;
  min-height: 104px;
  padding: 14px;
  text-decoration: none;
}

.reliability-metric:nth-child(2n) {
  border-right: 0;
}

.reliability-metric:hover,
.reliability-row:hover {
  background: var(--admin-panel-muted);
}

.reliability-metric span {
  color: var(--admin-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.reliability-metric strong {
  font-size: 22px;
  line-height: 1;
}

.reliability-metric :deep(.n-tag) {
  align-self: end;
  justify-self: start;
  max-width: 100%;
}

.reliability-row :deep(.n-tag) {
  justify-self: end;
  max-width: 100%;
}

.reliability-group {
  border-bottom: 1px solid var(--admin-border);
}

.reliability-group-header {
  align-items: center;
  background: var(--admin-panel-muted);
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
}

.reliability-group-header h4 {
  font-size: 13px;
  font-weight: 800;
}

.reliability-group-header p {
  color: var(--admin-text-muted);
  font-size: 11px;
  margin-top: 3px;
}

.reliability-group-header > span {
  color: var(--admin-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.reliability-row {
  align-items: center;
  border-bottom: 1px solid var(--admin-border);
  color: inherit;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 52px;
  padding: 9px 14px;
  text-decoration: none;
}

.reliability-row:last-child {
  border-bottom: 0;
}

.reliability-row-main,
.reliability-row-side {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.reliability-row-main strong {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reliability-row-main small,
.reliability-row-side small {
  color: var(--admin-text-muted);
  font-size: 11px;
}

.reliability-row-side {
  justify-items: end;
  min-width: 70px;
}

.reliability-row-side strong {
  font-size: 16px;
}

.reliability-footer {
  color: var(--admin-text-muted);
  font-size: 11px;
  margin-top: auto;
  padding: 10px 14px;
}

.reliability-empty {
  min-height: 220px;
  justify-content: center;
}

.reliability-empty-small {
  min-height: 120px;
  justify-content: center;
}
</style>
