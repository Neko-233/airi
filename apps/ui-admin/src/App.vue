<script setup lang="ts">
import type { GlobalThemeOverrides, MenuOption } from 'naive-ui'

import type { AdminMe } from './modules/api'

import { errorMessageFromUnknown } from '@proj-airi/stage-shared'
import { useTheme } from '@proj-airi/ui'
import {
  darkTheme,
  dateZhCN,
  NAvatar,
  NButton,
  NCard,
  NConfigProvider,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NResult,
  NSpace,
  NSpin,
  NTag,
  zhCN,
} from 'naive-ui'
import { computed, h, onMounted, shallowRef } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Toaster } from 'vue-sonner'

import airiIconUrl from '../../stage-tamagotchi/resources/icon.svg?url'

import { useAdminLocale } from './modules/admin-locale'
import { adminApi, AdminApiError, apiServerUrl, signInUrl } from './modules/api'

const route = useRoute()
const router = useRouter()
const { currentLocaleLabel, locale, nextLocaleLabel, t, toggleLocale } = useAdminLocale()
const { isDark, toggleDark } = useTheme()

const loading = shallowRef(true)
const me = shallowRef<AdminMe | null>(null)
const accessError = shallowRef<string | null>(null)

const navItems = [
  { to: '/', icon: 'i-lucide-layout-dashboard', labelKey: 'nav.overview', descriptionKey: 'nav.overviewDescription' },
  { to: '/users', icon: 'i-lucide-users', labelKey: 'nav.users', descriptionKey: 'nav.usersDescription' },
  { to: '/flux', icon: 'i-lucide-coins', labelKey: 'nav.flux', descriptionKey: 'nav.fluxDescription' },
  { to: '/llm-router', icon: 'i-lucide-route', labelKey: 'nav.llmRouter', descriptionKey: 'nav.llmRouterDescription' },
  { to: '/voice-packs', icon: 'i-lucide-volume-2', labelKey: 'nav.voicePacks', descriptionKey: 'nav.voicePacksDescription' },
  { to: '/insights', icon: 'i-lucide-chart-no-axes-combined', labelKey: 'nav.insights', descriptionKey: 'nav.insightsDescription' },
  { to: '/audit-log', icon: 'i-lucide-file-clock', labelKey: 'nav.audit', descriptionKey: 'nav.auditDescription' },
  { to: '/health', icon: 'i-lucide-heart-pulse', labelKey: 'nav.health', descriptionKey: 'nav.healthDescription' },
] as const

const activeNavItem = computed(() => navItems.find(item =>
  item.to === '/'
    ? route.path === '/'
    : route.path === item.to || route.path.startsWith(`${item.to}/`),
))
const activeMenuKey = computed(() => activeNavItem.value?.to ?? '/')
const menuOptions = computed<MenuOption[]>(() => navItems.map(item => ({
  key: item.to,
  label: () => h('span', { class: 'admin-menu-label' }, [
    h('span', { class: 'admin-menu-title' }, t(item.labelKey)),
    h('span', { class: 'admin-menu-description' }, t(item.descriptionKey)),
  ]),
  icon: () => h('span', { class: ['admin-menu-icon', item.icon] }),
})))
const currentTitle = computed(() => t(activeNavItem.value?.labelKey ?? 'nav.overview'))
const currentDescription = computed(() => t(activeNavItem.value?.descriptionKey ?? 'nav.overviewDescription'))
const themeLabel = computed(() => isDark.value ? t('theme.dark') : t('theme.light'))
const themeTitle = computed(() => isDark.value ? t('theme.switchLight') : t('theme.switchDark'))
const naiveTheme = computed(() => isDark.value ? darkTheme : null)
const naiveLocale = computed(() => locale.value === 'zh-CN' ? zhCN : null)
const naiveDateLocale = computed(() => locale.value === 'zh-CN' ? dateZhCN : null)
const apiOrigin = computed(() => apiServerUrl())
const isOverviewRoute = computed(() => route.path === '/')
const initials = computed(() => {
  const source = me.value?.user.name || me.value?.user.email || 'A'
  return source.slice(0, 1).toUpperCase()
})
const naiveThemeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontFamily: 'inherit',
    primaryColor: '#059669',
    primaryColorHover: '#10b981',
    primaryColorPressed: '#047857',
    primaryColorSuppl: '#34d399',
  },
  Menu: {
    itemHeight: '48px',
  },
}

onMounted(async () => {
  try {
    me.value = await adminApi.me()
  }
  catch (error) {
    if (error instanceof AdminApiError && error.status === 401) {
      window.location.href = signInUrl()
      return
    }

    accessError.value = errorMessageFromUnknown(error, t('app.accessRequired'))
  }
  finally {
    loading.value = false
  }
})

/**
 * Toggles the admin shell between light and dark themes.
 */
function toggleTheme() {
  toggleDark()
}

/**
 * Navigates to a selected admin route from the Naive UI menu.
 */
function handleMenuUpdate(value: string | number) {
  router.push(String(value))
}
</script>

<template>
  <NConfigProvider
    :date-locale="naiveDateLocale"
    :locale="naiveLocale"
    :theme="naiveTheme"
    :theme-overrides="naiveThemeOverrides"
  >
    <div class="admin-root">
      <div v-if="loading" class="admin-center-state">
        <NSpin size="medium">
          <template #description>
            {{ t('app.loadingSession') }}
          </template>
        </NSpin>
      </div>

      <div v-else-if="accessError" class="admin-center-state">
        <NCard class="admin-access-card" :bordered="true">
          <NResult
            status="403"
            :title="t('app.accessRequired')"
            :description="accessError"
          >
            <template #footer>
              <NButton tag="a" type="primary" :href="signInUrl()">
                <template #icon>
                  <span class="i-lucide-log-in" />
                </template>
                {{ t('action.signIn') }}
              </NButton>
            </template>
          </NResult>
        </NCard>
      </div>

      <NLayout v-else has-sider class="admin-shell">
        <NLayoutSider
          bordered
          class="admin-sidebar"
          :collapsed-width="72"
          :native-scrollbar="false"
          :width="292"
        >
          <div class="brand-block">
            <div class="brand-mark">
              <img alt="AIRI" class="brand-logo" :src="airiIconUrl">
            </div>
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold leading-tight">
                AIRI Admin
              </div>
              <div class="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {{ t('app.operatorConsole') }}
              </div>
            </div>
          </div>

          <NSpace class="quick-actions" :wrap="false">
            <NButton block type="primary" @click="router.push('/flux')">
              <template #icon>
                <span class="i-lucide-plus-circle" />
              </template>
              {{ t('action.quickGrant') }}
            </NButton>
            <NButton secondary block @click="router.push('/health')">
              <template #icon>
                <span class="i-lucide-heart-pulse" />
              </template>
              {{ t('action.health') }}
            </NButton>
          </NSpace>

          <NMenu
            class="admin-menu"
            :options="menuOptions"
            :value="activeMenuKey"
            @update:value="handleMenuUpdate"
          />

          <div class="admin-sidebar-footer">
            <div class="api-chip">
              <span class="i-lucide-server" />
              <span class="truncate">{{ apiOrigin }}</span>
            </div>
            <div class="admin-profile">
              <NAvatar round size="medium">
                {{ initials }}
              </NAvatar>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">
                  {{ me?.user.name }}
                </div>
                <div class="truncate text-xs text-neutral-500">
                  {{ me?.user.email }}
                </div>
              </div>
            </div>
          </div>
        </NLayoutSider>

        <NLayout class="admin-main">
          <NLayoutHeader bordered class="admin-topbar">
            <div class="min-w-0">
              <div class="admin-breadcrumb">
                <span class="i-lucide-panel-left" />
                <span>{{ t('app.admin') }}</span>
                <span>/</span>
                <span>{{ currentTitle }}</span>
              </div>
              <h1 class="admin-topbar-title">
                {{ currentTitle }}
              </h1>
            </div>
            <NSpace class="topbar-actions" align="center" :wrap="false">
              <NTag class="topbar-status" round>
                <template #icon>
                  <span class="i-lucide-shield-check" />
                </template>
                {{ currentDescription }}
              </NTag>
              <NButton secondary round :title="themeTitle" @click="toggleTheme">
                <template #icon>
                  <span :class="isDark ? 'i-lucide-moon' : 'i-lucide-sun'" />
                </template>
                {{ themeLabel }}
              </NButton>
              <NButton secondary round :title="nextLocaleLabel" @click="toggleLocale">
                <template #icon>
                  <span class="i-lucide-languages" />
                </template>
                {{ currentLocaleLabel }}
              </NButton>
            </NSpace>
          </NLayoutHeader>

          <NLayoutContent
            class="admin-content"
            :class="{ 'admin-content-overview': isOverviewRoute }"
            :native-scrollbar="false"
          >
            <RouterView />
          </NLayoutContent>
        </NLayout>
      </NLayout>

      <Toaster rich-colors position="top-right" />
    </div>
  </NConfigProvider>
</template>
