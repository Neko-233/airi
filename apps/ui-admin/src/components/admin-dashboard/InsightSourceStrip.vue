<script setup lang="ts">
import type { AdminInsightStatus } from '../../modules/api'

import { NTag } from 'naive-ui'

import { t } from '../../modules/admin-locale'

export interface InsightSourceSignal {
  detail: string
  icon: string
  id: string
  label: string
  status: AdminInsightStatus
  value: string
}

defineProps<{
  signals: InsightSourceSignal[]
}>()

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
</script>

<template>
  <section class="source-strip" aria-label="insight sources">
    <article v-for="signal in signals" :key="signal.id" class="source-strip-item">
      <span :class="['source-strip-icon', signal.icon]" />
      <span class="source-strip-copy">
        <span>{{ signal.label }}</span>
        <strong>{{ signal.value }}</strong>
        <small>{{ signal.detail }}</small>
      </span>
      <NTag :bordered="false" round size="small" :type="insightTagType(signal.status)">
        {{ t(`status.${signal.status}`) }}
      </NTag>
    </article>
  </section>
</template>

<style scoped>
.source-strip {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
}

.source-strip-item {
  align-items: center;
  border-right: 1px solid var(--admin-border);
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  min-width: 0;
  padding: 12px 14px;
  position: relative;
}

.source-strip-item:last-child {
  border-right: 0;
}

.source-strip-icon {
  color: var(--admin-accent);
  font-size: 18px;
  grid-row: 1 / span 2;
}

.source-strip-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.source-strip-copy span {
  color: var(--admin-text-muted);
  font-size: 11px;
  font-weight: 750;
}

.source-strip-copy strong {
  font-size: 15px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-strip-copy small {
  color: var(--admin-text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-strip-item :deep(.n-tag) {
  position: absolute;
  right: 12px;
  top: 12px;
}

.source-strip-copy strong {
  padding-right: 48px;
}

@media (max-width: 1200px) {
  .source-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .source-strip-item:nth-child(2n) {
    border-right: 0;
  }
}
</style>
