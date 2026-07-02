<script setup lang="ts">
import type { AdminInsightMetric, AdminInsightStatus } from '../../modules/api'

import { NEmpty } from 'naive-ui'

import { t } from '../../modules/admin-locale'

defineProps<{
  metrics: AdminInsightMetric[]
}>()

/**
 * Returns the localized label for a known insight metric.
 */
function metricLabel(metric: AdminInsightMetric): string {
  const key = `insights.metric.${metric.id}.label`
  const translated = t(key)
  return translated === key ? metric.label : translated
}

/**
 * Formats a metric value with its optional unit.
 */
function metricValue(metric: AdminInsightMetric): string {
  return metric.unit ? `${metric.value}${metric.unit === '%' ? '%' : ` ${metric.unit}`}` : String(metric.value)
}

/**
 * Maps insight status to compact attention chip classes.
 */
function attentionStatusClass(status: AdminInsightStatus): string {
  if (status === 'critical')
    return 'attention-chip-critical'
  if (status === 'warning')
    return 'attention-chip-warning'
  return 'attention-chip-unknown'
}
</script>

<template>
  <aside class="attention-rail">
    <header class="attention-rail-header">
      <span class="i-lucide-shield-alert" />
      <div>
        <p>{{ t('insights.attentionTitle') }}</p>
        <strong>{{ t('insights.attentionDescription', { count: String(metrics.length) }) }}</strong>
      </div>
    </header>

    <NEmpty v-if="metrics.length === 0" class="attention-empty" :description="t('overview.noDegradedChecks')" />
    <div v-else class="attention-list">
      <a
        v-for="metric in metrics"
        :key="metric.id"
        :class="['attention-chip', attentionStatusClass(metric.status)]"
        :href="metric.href ?? undefined"
        rel="noreferrer"
        target="_blank"
      >
        <span class="i-lucide-triangle-alert" />
        <span>{{ metricLabel(metric) }}</span>
        <strong>{{ metricValue(metric) }}</strong>
      </a>
    </div>
  </aside>
</template>

<style scoped>
.attention-rail {
  align-items: center;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.03));
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 6px;
  display: grid;
  grid-template-columns: minmax(220px, auto) minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.attention-rail-header {
  align-items: center;
  display: flex;
  gap: 12px;
  padding: 14px 16px;
}

.attention-rail-header > span {
  color: #f59e0b;
  font-size: 19px;
}

.attention-rail-header p {
  font-size: 13px;
  font-weight: 800;
}

.attention-rail-header strong {
  color: var(--admin-text-muted);
  display: block;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 3px;
}

.attention-list {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  min-height: 0;
  padding: 10px 14px;
}

.attention-chip {
  align-items: center;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: 4px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 800;
  gap: 6px;
  height: 28px;
  max-width: 260px;
  overflow: hidden;
  padding: 0 9px;
  text-decoration: none;
  white-space: nowrap;
}

.attention-chip:hover {
  background: rgba(245, 158, 11, 0.08);
}

.attention-chip > span:first-child {
  flex-shrink: 0;
  font-size: 13px;
}

.attention-chip > span:nth-child(2) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.attention-chip > strong {
  flex-shrink: 0;
  font-size: 12px;
}

.attention-chip-warning {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.attention-chip-critical {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.28);
  color: #f87171;
}

.attention-chip-unknown {
  background: rgba(96, 165, 250, 0.12);
  border-color: rgba(96, 165, 250, 0.24);
  color: #60a5fa;
}

.attention-empty {
  justify-content: center;
  min-height: 54px;
}

@media (max-width: 900px) {
  .attention-rail {
    grid-template-columns: 1fr;
  }
}
</style>
