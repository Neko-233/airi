<script setup lang="ts">
import { NStatistic } from 'naive-ui'

export interface OverviewStatusItem {
  detail: string
  icon: string
  label: string
  value: string
}

defineProps<{
  items: OverviewStatusItem[]
}>()
</script>

<template>
  <section class="overview-status-strip" aria-label="overview status">
    <article v-for="item in items" :key="item.label" class="overview-status-item">
      <div class="overview-status-heading">
        <span :class="['overview-status-icon', item.icon]" />
        <span>{{ item.label }}</span>
      </div>
      <NStatistic class="overview-status-stat" :value="item.value" />
      <p class="overview-status-detail">
        {{ item.detail }}
      </p>
    </article>
  </section>
</template>

<style scoped>
.overview-status-strip {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
}

.overview-status-item {
  border-right: 1px solid var(--admin-border);
  min-width: 0;
  padding: 16px 18px;
}

.overview-status-item:last-child {
  border-right: 0;
}

.overview-status-heading {
  align-items: center;
  color: var(--admin-text-muted);
  display: flex;
  font-size: 12px;
  font-weight: 700;
  gap: 8px;
  min-width: 0;
}

.overview-status-icon {
  color: var(--admin-accent);
  flex-shrink: 0;
  font-size: 16px;
}

.overview-status-stat {
  margin-top: 12px;
}

.overview-status-detail {
  color: var(--admin-text-muted);
  font-size: 12px;
  line-height: 1.35;
  margin-top: 8px;
}

@media (max-width: 1100px) {
  .overview-status-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-status-item:nth-child(2n) {
    border-right: 0;
  }
}
</style>
