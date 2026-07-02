<script setup lang="ts">
import type { AdminAuditLogEntry } from '../../modules/api'

import { NEmpty, NTag, NTimeline, NTimelineItem } from 'naive-ui'
import { RouterLink } from 'vue-router'

import { formatAdminDate, t } from '../../modules/admin-locale'

defineProps<{
  logs: AdminAuditLogEntry[]
  unavailable: boolean
}>()

/**
 * Maps audit risk to Naive UI timeline and tag intent values.
 */
function riskType(risk: AdminAuditLogEntry['risk']): 'default' | 'warning' | 'error' {
  if (risk === 'critical')
    return 'error'
  if (risk === 'high')
    return 'warning'
  return 'default'
}

/**
 * Formats audit timestamps for the compact risk timeline.
 */
function formatDateTime(value: string): string {
  return formatAdminDate(value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
</script>

<template>
  <section class="risk-timeline-panel">
    <header class="risk-timeline-header">
      <div>
        <p>{{ t('overview.highRiskActions') }}</p>
        <h3>{{ t('audit.title') }}</h3>
      </div>
      <RouterLink class="risk-timeline-link" to="/audit-log">
        {{ t('action.auditLog') }}
        <span class="i-lucide-arrow-right" />
      </RouterLink>
    </header>

    <NEmpty v-if="unavailable" class="risk-timeline-empty" :description="t('audit.unavailable')" />
    <NEmpty v-else-if="logs.length === 0" class="risk-timeline-empty" :description="t('overview.noHighRisk')" />
    <NTimeline v-else class="risk-timeline-list">
      <NTimelineItem
        v-for="log in logs"
        :key="log.id"
        :type="riskType(log.risk)"
      >
        <RouterLink class="risk-timeline-row" to="/audit-log">
          <span class="risk-timeline-summary">{{ log.summary }}</span>
          <span class="risk-timeline-meta">
            {{ log.actor?.email ?? t('common.system') }} · {{ formatDateTime(log.createdAt) }}
          </span>
          <NTag :bordered="false" size="small" :type="riskType(log.risk)">
            {{ t(`risk.${log.risk}`) }}
          </NTag>
        </RouterLink>
      </NTimelineItem>
    </NTimeline>
  </section>
</template>

<style scoped>
.risk-timeline-panel {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.risk-timeline-header {
  align-items: center;
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  min-height: 68px;
  padding: 14px 18px;
}

.risk-timeline-header p {
  color: var(--admin-accent);
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.risk-timeline-header h3 {
  font-size: 15px;
  font-weight: 750;
}

.risk-timeline-link {
  align-items: center;
  color: var(--admin-accent);
  display: inline-flex;
  font-size: 12px;
  font-weight: 750;
  gap: 6px;
  text-decoration: none;
}

.risk-timeline-list {
  padding: 18px 18px 8px;
}

.risk-timeline-row {
  color: inherit;
  display: grid;
  gap: 5px;
  text-decoration: none;
}

.risk-timeline-summary {
  font-size: 13px;
  font-weight: 750;
  line-height: 1.3;
}

.risk-timeline-meta {
  color: var(--admin-text-muted);
  font-size: 11px;
}

.risk-timeline-row :deep(.n-tag) {
  justify-self: start;
  margin-top: 3px;
}

.risk-timeline-empty {
  min-height: 260px;
  justify-content: center;
}
</style>
