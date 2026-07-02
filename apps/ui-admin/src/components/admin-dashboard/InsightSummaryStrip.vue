<script setup lang="ts">
import type { AdminInsightStatus } from '../../modules/api'

export interface InsightSummarySignal {
  detail: string
  icon: string
  id: string
  label: string
  status: AdminInsightStatus
  value: string
}

defineProps<{
  signals: InsightSummarySignal[]
}>()

/**
 * Maps insight status to compact summary visual states.
 */
function summaryStateClass(status: AdminInsightStatus): string {
  if (status === 'critical')
    return 'summary-strip-item-critical'
  if (status === 'warning')
    return 'summary-strip-item-warning'
  if (status === 'ok')
    return 'summary-strip-item-ok'
  return 'summary-strip-item-unknown'
}
</script>

<template>
  <section class="summary-strip" aria-label="insight summary">
    <article
      v-for="signal in signals"
      :key="signal.id"
      :class="['summary-strip-item', summaryStateClass(signal.status)]"
    >
      <span :class="['summary-strip-icon', signal.icon]" />
      <span class="summary-strip-copy">
        <span>{{ signal.label }}</span>
        <strong>{{ signal.value }}</strong>
        <small>{{ signal.detail }}</small>
      </span>
    </article>
  </section>
</template>

<style scoped>
.summary-strip {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
}

.summary-strip-item {
  align-items: center;
  border-right: 1px solid var(--admin-border);
  display: grid;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 84px;
  min-width: 0;
  padding: 14px 16px;
}

.summary-strip-item:last-child {
  border-right: 0;
}

.summary-strip-icon {
  font-size: 22px;
}

.summary-strip-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.summary-strip-copy span {
  color: var(--admin-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.summary-strip-copy strong {
  font-size: 25px;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-strip-copy small {
  color: var(--admin-text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-strip-item-ok .summary-strip-icon {
  color: var(--admin-accent);
}

.summary-strip-item-warning .summary-strip-icon {
  color: #f59e0b;
}

.summary-strip-item-critical .summary-strip-icon {
  color: #ef4444;
}

.summary-strip-item-unknown .summary-strip-icon {
  color: #60a5fa;
}

@media (max-width: 1200px) {
  .summary-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-strip-item:nth-child(2n) {
    border-right: 0;
  }
}
</style>
