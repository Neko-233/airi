<script setup lang="ts">
import type { AdminUser, FluxTransaction } from '../modules/api'

import { errorMessageFromUnknown } from '@proj-airi/stage-shared'
import { DoubleCheckButton } from '@proj-airi/ui'
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { toast } from 'vue-sonner'

import AdminListPanel from '../components/admin-list/AdminListPanel.vue'

import { formatAdminDate, formatAdminNumber, t } from '../modules/admin-locale'
import { adminApi } from '../modules/api'

const users = shallowRef<AdminUser[]>([])
const selected = shallowRef<AdminUser | null>(null)
const transactions = shallowRef<FluxTransaction[]>([])
const loading = shallowRef(false)
const loadingPage = shallowRef<number | null>(null)
const detailLoading = shallowRef(false)
const currentPage = shallowRef(1)
const sortDirection = shallowRef<'asc' | 'desc'>('desc')
const sortKey = shallowRef('createdAt')
const statusFilter = shallowRef('all')
const totalUsers = shallowRef(0)
const pageSize = 20

const search = shallowRef('')
const columns = computed(() => [
  { key: 'user', label: t('user.title'), sortable: true },
  { key: 'status', label: t('user.status'), sortable: true },
  { key: 'flux', label: 'Flux', sortable: true },
  { key: 'createdAt', label: t('user.created'), sortable: true },
])
const statusFilters = computed(() => [
  {
    key: 'status',
    label: t('user.status'),
    value: statusFilter.value,
    options: [
      { label: t('user.all'), value: 'all' },
      { label: t('user.verified'), value: 'verified' },
      { label: t('user.unverified'), value: 'unverified' },
    ],
  },
])
const fluxForm = reactive({
  grantAmount: 100,
  grantDescription: '管理员 Flux 发放',
  targetBalance: 0,
  balanceDescription: '管理员余额调整',
})

const selectedStatus = computed(() => selected.value?.emailVerified ? t('user.verified') : t('user.unverified'))
const totalPages = computed(() => Math.max(1, Math.ceil(totalUsers.value / pageSize)))
const pageStart = computed(() => totalUsers.value === 0 ? 0 : (currentPage.value - 1) * pageSize + 1)
const pageEnd = computed(() => Math.min(currentPage.value * pageSize, totalUsers.value))
const isInitialLoading = computed(() => loading.value && users.value.length === 0)

onMounted(() => {
  void loadUsers(1)
})

async function loadUsers(page: number) {
  const nextPage = clampPage(page)
  loading.value = true
  loadingPage.value = nextPage
  try {
    const result = await adminApi.users({
      query: search.value.trim() || undefined,
      limit: pageSize,
      offset: (nextPage - 1) * pageSize,
      sortDirection: sortDirection.value,
      sortKey: sortKey.value === 'user' ? 'name' : sortKey.value,
      status: statusFilter.value,
    })
    users.value = result.users
    totalUsers.value = result.total
    currentPage.value = nextPage
    if (result.users[0] && !result.users.some(user => user.id === selected.value?.id))
      await selectUser(result.users[0])
    if (result.users.length === 0) {
      selected.value = null
      transactions.value = []
    }
  }
  catch (error) {
    toast.error(errorMessageFromUnknown(error, t('user.failedLoadUsers')))
  }
  finally {
    loading.value = false
    loadingPage.value = null
  }
}

function clampPage(page: number): number {
  if (!Number.isFinite(page))
    return currentPage.value
  return Math.min(Math.max(1, Math.trunc(page)), totalPages.value)
}

function setFilter(key: string, value: string) {
  if (key !== 'status')
    return
  statusFilter.value = value
  void loadUsers(1)
}

function setPage(page: number) {
  void loadUsers(page)
}

function setSearch(value: string) {
  search.value = value
  void loadUsers(1)
}

function setSort(key: string) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortKey.value = key
    sortDirection.value = key === 'createdAt' ? 'desc' : 'asc'
  }
  void loadUsers(1)
}

async function selectUser(user: AdminUser) {
  detailLoading.value = true
  try {
    const result = await adminApi.user(user.id)
    selected.value = result.user
    transactions.value = result.recentFluxTransactions
    fluxForm.targetBalance = result.user.flux
  }
  catch (error) {
    toast.error(errorMessageFromUnknown(error, t('user.failedLoadUser')))
  }
  finally {
    detailLoading.value = false
  }
}

async function grantFlux() {
  if (!selected.value)
    return
  try {
    const result = await adminApi.grantUserFlux(selected.value.id, {
      amount: Number(fluxForm.grantAmount),
      description: fluxForm.grantDescription,
    })
    toast.success(t('user.balanceUpdated', { value: formatNumber(result.balanceAfter) }))
    await selectUser(selected.value)
    await loadUsers(currentPage.value)
  }
  catch (error) {
    toast.error(errorMessageFromUnknown(error, t('user.failedGrantFlux')))
  }
}

async function setBalance() {
  if (!selected.value)
    return
  try {
    const result = await adminApi.setUserFlux(selected.value.id, {
      balance: Number(fluxForm.targetBalance),
      description: fluxForm.balanceDescription,
    })
    toast.success(result.changed ? t('user.balanceSet', { value: formatNumber(result.balanceAfter) }) : t('user.balanceUnchanged'))
    await selectUser(selected.value)
    await loadUsers(currentPage.value)
  }
  catch (error) {
    toast.error(errorMessageFromUnknown(error, t('user.failedSetBalance')))
  }
}

function formatNumber(value: number | null | undefined): string {
  return formatAdminNumber(value)
}

function formatDate(value: string): string {
  return formatAdminDate(value)
}
</script>

<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
    <AdminListPanel
      :columns="columns"
      :current-page="currentPage"
      :description="t('user.description')"
      :empty-label="t('user.empty')"
      :filters="statusFilters"
      :initial-loading="isInitialLoading"
      :loading="loading"
      :loading-page="loadingPage"
      :page-end="pageEnd"
      :page-start="pageStart"
      :search="search"
      :search-placeholder="t('user.searchPlaceholder')"
      :sort-direction="sortDirection"
      :sort-key="sortKey"
      :title="t('user.title')"
      :total-items="totalUsers"
      :total-pages="totalPages"
      @filter="setFilter"
      @page="setPage"
      @search="setSearch"
      @sort="setSort"
    >
      <template #rows>
        <tr
          v-for="user in users"
          :key="user.id"
          class="cursor-pointer transition-colors hover:bg-neutral-50"
          :class="{ 'bg-emerald-50/50': selected?.id === user.id }"
          tabindex="0"
          @click="selectUser(user)"
          @keydown.enter.prevent="selectUser(user)"
          @keydown.space.prevent="selectUser(user)"
        >
          <td>
            <div class="font-medium">
              {{ user.name }}
            </div>
            <div class="mt-1 text-xs text-neutral-500">
              {{ user.email }}
            </div>
          </td>
          <td>
            <span class="badge" :class="user.emailVerified ? 'badge-green' : 'badge-amber'">
              <span :class="user.emailVerified ? 'i-lucide-check-circle-2' : 'i-lucide-clock-3'" />
              {{ user.emailVerified ? t('user.verified') : t('user.unverified') }}
            </span>
          </td>
          <td class="font-semibold">
            {{ formatNumber(user.flux) }}
          </td>
          <td>{{ formatDate(user.createdAt) }}</td>
        </tr>
      </template>
    </AdminListPanel>

    <aside class="space-y-4">
      <section class="panel p-5">
        <div v-if="!selected" class="empty-state">
          <span class="i-lucide-mouse-pointer-click text-2xl" />
          {{ t('user.selectUser') }}
        </div>
        <div v-else class="space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate text-base font-semibold">
                {{ selected.name }}
              </h2>
              <p class="mt-1 truncate text-sm text-neutral-500">
                {{ selected.email }}
              </p>
            </div>
            <span class="badge" :class="selected.emailVerified ? 'badge-green' : 'badge-amber'">
              {{ selectedStatus }}
            </span>
          </div>

          <div class="detail-stat-grid">
            <div class="detail-stat-cell">
              <div class="text-xs text-neutral-500">
                {{ t('user.fluxBalance') }}
              </div>
              <div class="mt-1 text-xl font-semibold">
                {{ formatNumber(selected.flux) }}
              </div>
            </div>
            <div class="detail-stat-cell">
              <div class="text-xs text-neutral-500">
                {{ t('user.joined') }}
              </div>
              <div class="mt-1 text-sm font-semibold">
                {{ formatDate(selected.createdAt) }}
              </div>
            </div>
          </div>

          <div class="admin-form-section">
            <label class="text-xs text-neutral-500 font-semibold uppercase">{{ t('user.grantFlux') }}</label>
            <div class="grid grid-cols-[110px_minmax(0,1fr)] mt-3 gap-2">
              <input v-model.number="fluxForm.grantAmount" class="field" min="1" type="number">
              <input v-model="fluxForm.grantDescription" class="field" type="text">
            </div>
            <DoubleCheckButton
              block
              size="sm"
              variant="caution"
              :disabled="detailLoading"
              class="mt-3"
              @confirm="grantFlux"
            >
              <span class="inline-flex items-center gap-2">
                <span class="i-lucide-plus-circle" />
                {{ t('user.grantFlux') }}
              </span>
              <template #confirm>
                {{ t('action.confirmGrant') }}
              </template>
            </DoubleCheckButton>
          </div>

          <div class="admin-form-section">
            <label class="text-xs text-neutral-500 font-semibold uppercase">{{ t('user.setBalance') }}</label>
            <div class="grid grid-cols-[110px_minmax(0,1fr)] mt-3 gap-2">
              <input v-model.number="fluxForm.targetBalance" class="field" min="0" type="number">
              <input v-model="fluxForm.balanceDescription" class="field" type="text">
            </div>
            <DoubleCheckButton
              block
              size="sm"
              variant="caution"
              :disabled="detailLoading"
              class="mt-3"
              @confirm="setBalance"
            >
              <span class="inline-flex items-center gap-2">
                <span class="i-lucide-pencil" />
                {{ t('user.setBalance') }}
              </span>
              <template #confirm>
                {{ t('action.confirmSet') }}
              </template>
            </DoubleCheckButton>
          </div>
        </div>
      </section>

      <section v-if="selected" class="panel overflow-hidden">
        <div class="border-b border-neutral-200 px-4 py-3 text-sm font-semibold">
          {{ t('user.transactions') }}
        </div>
        <div v-if="transactions.length === 0" class="empty-state min-h-32">
          {{ t('user.noTransactions') }}
        </div>
        <div v-else class="max-h-[360px] overflow-auto">
          <div v-for="tx in transactions" :key="tx.id" class="border-b border-neutral-100 px-4 py-3 last:border-b-0">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium">{{ tx.description }}</span>
              <span class="text-sm font-semibold" :class="tx.type === 'debit' ? 'text-red-600' : 'text-emerald-700'">
                {{ tx.type === 'debit' ? '-' : '+' }}{{ formatNumber(tx.amount) }}
              </span>
            </div>
            <div class="mt-1 text-xs text-neutral-500">
              {{ tx.type }} · {{ formatDate(tx.createdAt) }} · {{ formatNumber(tx.balanceBefore) }} -> {{ formatNumber(tx.balanceAfter) }}
            </div>
          </div>
        </div>
      </section>
    </aside>
  </div>
</template>
