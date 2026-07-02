<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { t } from '../../modules/admin-locale'

export interface OverviewCommandLink {
  description: string
  icon: string
  title: string
  to: string
  tone: string
}

defineProps<{
  links: OverviewCommandLink[]
}>()
</script>

<template>
  <section class="command-rail">
    <div class="command-rail-copy">
      <p>{{ t('overview.operationalSurfaces') }}</p>
      <strong>{{ t('overview.operationalSurfacesDescription') }}</strong>
    </div>
    <nav class="command-rail-links" aria-label="admin commands">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        class="command-rail-link"
        :to="link.to"
      >
        <span :class="[link.icon, link.tone, 'command-rail-icon']" />
        <span class="command-rail-text">
          <strong>{{ link.title }}</strong>
          <small>{{ link.description }}</small>
        </span>
        <span class="i-lucide-arrow-right command-rail-arrow" />
      </RouterLink>
    </nav>
  </section>
</template>

<style scoped>
.command-rail {
  align-items: stretch;
  border-top: 1px solid var(--admin-border);
  display: grid;
  gap: 18px;
  grid-template-columns: 260px minmax(0, 1fr);
  padding-top: 14px;
}

.command-rail-copy {
  display: grid;
  gap: 5px;
}

.command-rail-copy p {
  color: var(--admin-accent);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.command-rail-copy strong {
  color: var(--admin-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.command-rail-links {
  border-left: 1px solid var(--admin-border);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.command-rail-link {
  align-items: center;
  border-right: 1px solid var(--admin-border);
  color: inherit;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-height: 72px;
  padding: 10px 14px;
  text-decoration: none;
}

.command-rail-link:hover {
  background: var(--admin-panel-muted);
}

.command-rail-icon {
  font-size: 17px;
}

.command-rail-text {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.command-rail-text strong {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-rail-text small {
  color: var(--admin-text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-rail-arrow {
  color: var(--admin-text-muted);
  font-size: 13px;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 160ms ease, transform 160ms ease;
}

.command-rail-link:hover .command-rail-arrow {
  opacity: 1;
  transform: translateX(0);
}

@media (max-width: 1280px) {
  .command-rail {
    grid-template-columns: 1fr;
  }

  .command-rail-links {
    border-left: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
