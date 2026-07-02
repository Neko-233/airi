import {
  mockAdminAuditLogs,
  mockAdminHealth,
  mockAdminMe,
  mockAdminMetrics,
  mockAdminProductInsights,
  mockAdminReliabilityInsights,
  shouldUseMockAdminApi,
} from './mock-admin-api'
import { defaultApiServerUrl, getServerAdminBootstrapContext } from './server-admin-context'

export interface AdminUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: string
  updatedAt: string
  flux: number
  stripeCustomerId: string | null
}

export interface AdminMe {
  role: 'admin'
  user: Pick<AdminUser, 'id' | 'name' | 'email' | 'emailVerified' | 'image'>
}

export interface AdminMetrics {
  totalUsers: number
  verifiedUsers: number
  activeSessions: number
  currentFlux: number
  issuedFlux: number
  llmRequests24h: number
  llmFlux24h: number
  adminSeats: number
  grafanaEmbedUrl: string | null
}

/**
 * Represents the normalized status vocabulary for admin insight metrics.
 */
export type AdminInsightStatus = 'ok' | 'warning' | 'critical' | 'unknown'

/**
 * Represents one product or reliability insight metric surfaced to operators.
 */
export interface AdminInsightMetric {
  /** Stable metric identifier used for localization and display grouping. */
  id: string
  /** Fallback human-readable label supplied by the API. */
  label: string
  /** Already aggregated metric value. */
  value: number | string
  /** Optional unit label, such as `ms` or `%`. */
  unit: string | null
  /** Operator-facing status tier for badges and sorting. */
  status: AdminInsightStatus
  /** Fallback description supplied by the API. */
  description: string
  /** Deep link to the owning analytics or observability surface. */
  href: string | null
}

/**
 * Represents one row inside a grouped insight breakdown.
 */
export interface AdminInsightBreakdownItem {
  /** Stable item identifier used for localization and list keys. */
  id: string
  /** Fallback human-readable label supplied by the API. */
  label: string
  /** Primary row value. */
  value: number | string
  /** Optional primary unit label. */
  unit: string | null
  /** Optional secondary value, such as unique users or share. */
  secondaryValue: string | null
  /** Operator-facing status tier for row badges. */
  status: AdminInsightStatus
  /** Fallback row description supplied by the API. */
  description: string
  /** Deep link to the owning analytics or observability surface. */
  href: string | null
}

/**
 * Represents a grouped product or reliability detail section.
 */
export interface AdminInsightBreakdown {
  /** Stable breakdown identifier used for localization and display grouping. */
  id: string
  /** Fallback human-readable heading supplied by the API. */
  label: string
  /** Fallback description supplied by the API. */
  description: string
  /** Rows inside this breakdown. */
  items: AdminInsightBreakdownItem[]
}

/**
 * Represents PostHog-backed product analytics for the admin console.
 */
export interface AdminProductInsights {
  /** Whether the server has enough PostHog configuration to query live data. */
  configured: boolean
  /** Stable source identifier. */
  source: 'posthog'
  /** Rolling time window used by the backend aggregate query. */
  windowDays: number
  /** Optional deep link to the richer PostHog dashboard. */
  dashboardUrl: string | null
  /** Product activation and voice usage metrics. */
  metrics: AdminInsightMetric[]
  /** Detailed event rollups grouped by product question. */
  breakdowns: AdminInsightBreakdown[]
  /** ISO timestamp for when the server generated this response. */
  updatedAt: string
  /** Non-fatal query error when the integration is configured but unavailable. */
  errorMessage: string | null
}

/**
 * Represents one Grafana alert rule row shown in the admin console.
 */
export interface AdminReliabilityAlertRule {
  /** Stable alert rule identifier. */
  id: string
  /** Human-readable Grafana alert rule name. */
  name: string
  /** Grafana folder or folder UID when available. */
  folder: string | null
  /** Normalized display state, such as `active` or `paused`. */
  state: string | null
  /** Deep link to the alert rule or dashboard. */
  href: string | null
}

/**
 * Represents Grafana-backed reliability insights for the admin console.
 */
export interface AdminReliabilityInsights {
  /** Whether the server has enough Grafana configuration to query live data. */
  configured: boolean
  /** Stable source identifier. */
  source: 'grafana'
  /** Optional deep link to the richer Grafana dashboard. */
  dashboardUrl: string | null
  /** Reliability summary metrics. */
  metrics: AdminInsightMetric[]
  /** Detailed rule rollups grouped by reliability question. */
  breakdowns: AdminInsightBreakdown[]
  /** Recent or important alert rules returned by Grafana. */
  alertRules: AdminReliabilityAlertRule[]
  /** ISO timestamp for when the server generated this response. */
  updatedAt: string
  /** Non-fatal query error when the integration is configured but unavailable. */
  errorMessage: string | null
}

/**
 * Represents the operational blast radius of an admin action.
 */
export type AdminAuditLogRisk = 'low' | 'medium' | 'high' | 'critical'

/**
 * Represents the final execution state of an audited admin action.
 */
export type AdminAuditLogStatus = 'success' | 'failed' | 'pending'

/**
 * Represents one durable operator action written by the admin API.
 */
export interface AdminAuditLogEntry {
  /** Stable audit event identifier. */
  id: string
  /** User who triggered the action; null when the actor was a system task. */
  actor: Pick<AdminUser, 'id' | 'name' | 'email'> | null
  /** Machine-readable action name, such as `flux.grant.bulk`. */
  action: string
  /** Target domain type, such as `user`, `router_config`, or `voice_pack`. */
  targetType: string
  /** Target object identifier when the action references one object. */
  targetId: string | null
  /** Human-readable target label for table display. */
  targetLabel: string | null
  /** Risk tier used for filtering and visual warnings. */
  risk: AdminAuditLogRisk
  /** Execution status of the audited action. */
  status: AdminAuditLogStatus
  /** Short operator-facing description of what happened. */
  summary: string
  /** API-owned structured details for drill-down views. */
  metadata: unknown
  /** ISO timestamp for when the action was created. */
  createdAt: string
}

/**
 * Represents a paginated audit log response from the admin API.
 */
export interface AdminAuditLogsPage {
  /** Audit entries for the current page. */
  logs: AdminAuditLogEntry[]
  /** Whether another page exists after this response. */
  hasMore: boolean
  /** Offset to request for the next page. */
  nextOffset: number | null
  /** Total matching audit entries. */
  total: number
}

/**
 * Represents the normalized status vocabulary for service health checks.
 */
export type AdminHealthStatus = 'operational' | 'degraded' | 'down' | 'unknown'

/**
 * Represents one backend dependency or service health check.
 */
export interface AdminHealthCheck {
  /** Stable check identifier. */
  id: string
  /** Human-readable service label. */
  label: string
  /** Current service status. */
  status: AdminHealthStatus
  /** Operator-facing detail or last error summary. */
  detail: string
  /** ISO timestamp of the last check, or null when unavailable. */
  checkedAt: string | null
  /** Last observed latency in milliseconds, or null when not measured. */
  latencyMs: number | null
}

/**
 * Represents the full operational health payload for the admin console.
 */
export interface AdminHealthReport {
  /** Aggregated status across checks and incidents. */
  status: AdminHealthStatus
  /** ISO timestamp for when the report was generated. */
  checkedAt: string
  /** Dependency and subsystem health checks. */
  checks: AdminHealthCheck[]
  /** Open or recent incidents surfaced to operators. */
  incidents: Array<{
    id: string
    title: string
    severity: AdminAuditLogRisk
    status: 'open' | 'monitoring' | 'resolved'
    startedAt: string
    summary: string
  }>
}

export interface FluxTransaction {
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  metadata: unknown
  createdAt: string
}

export interface AdminUsersPage {
  users: AdminUser[]
  hasMore: boolean
  nextOffset: number | null
  total: number
}

export interface AdminRouterOpenRouterSlice {
  kind: 'openrouter'
  modelName: string
  overrideModel: string
  plaintextKey?: string
  baseURL?: string
  keyEntryId?: string
  existingKeyEntryId?: string
  headerTemplate?: string
}

export interface AdminRouterAzureSlice {
  kind: 'azure'
  modelName: string
  region: string
  defaultVoice?: string
  plaintextKey?: string
  keyEntryId?: string
  existingKeyEntryId?: string
}

export interface AdminRouterDashscopeSlice {
  kind: 'dashscope-cosyvoice'
  modelName: string
  region: 'intl' | 'cn'
  upstreamModel: string
  plaintextKey?: string
  keyEntryId?: string
  existingKeyEntryId?: string
}

export interface AdminRouterStepfunSlice {
  kind: 'stepfun'
  modelName: string
  upstreamModel?: 'stepaudio-2.5-tts' | 'step-tts-2' | 'step-tts-mini'
  defaultVoice?: string
  instruction?: string
  plaintextKey?: string
  keyEntryId?: string
  existingKeyEntryId?: string
}

export interface AdminRouterUnspeechSlice {
  kind: 'unspeech'
  restBaseURL: string
  streaming?: {
    upstreamURL: string
    plaintextKey?: string
    keyEntryId?: string
    existingKeyEntryId?: string
    models?: Array<{ id: string, name?: string, description?: string }>
    defaultModel?: string
  }
}

export interface AdminRouterAliyunNlsAsrSlice {
  kind: 'aliyun-nls-asr'
  modelName: string
  accessKeyId: string
  appKey: string
  region?: 'cn-shanghai' | 'cn-shanghai-internal' | 'cn-beijing' | 'cn-beijing-internal' | 'cn-shenzhen' | 'cn-shenzhen-internal'
  plaintextKey?: string
  keyEntryId?: string
  existingKeyEntryId?: string
}

export type AdminRouterConfigSlice
  = | AdminRouterOpenRouterSlice
    | AdminRouterAzureSlice
    | AdminRouterDashscopeSlice
    | AdminRouterStepfunSlice
    | AdminRouterAliyunNlsAsrSlice
    | AdminRouterUnspeechSlice

export interface AdminRouterConfigRequest {
  mode?: 'merge' | 'reset'
  dryRun?: boolean
  slices?: AdminRouterConfigSlice[]
  defaults?: {
    chatModel?: string
    ttsModel?: string
    ttsVoices?: Record<string, Record<string, string>>
  }
}

export interface AdminRouterConfigResult {
  applied: Array<Record<string, unknown>>
  invalidatedKeys: string[]
  preview: Record<string, unknown>
}

export interface AdminRouterConfigCurrent {
  request: AdminRouterConfigRequest
  preview: Record<string, unknown>
  loadedAt: string
  missingKeys: string[]
}

/**
 * Represents a persisted LLM router configuration version.
 */
export interface AdminRouterConfigHistoryEntry {
  /** Stable version identifier used by rollback endpoints. */
  id: string
  /** Monotonic display version assigned by the API. */
  version: number
  /** Admin user who applied this version. */
  actor: Pick<AdminUser, 'id' | 'name' | 'email'> | null
  /** Short description of the version change. */
  summary: string
  /** Original request payload used to produce this version. */
  request: AdminRouterConfigRequest
  /** Rendered router preview after this version was applied. */
  preview: Record<string, unknown>
  /** ISO timestamp for when the version was applied. */
  createdAt: string
  /** Whether the API currently allows rollback to this version. */
  rollbackable: boolean
}

/**
 * Represents a paginated router configuration history response.
 */
export interface AdminRouterConfigHistoryPage {
  /** Router config versions for the current page. */
  versions: AdminRouterConfigHistoryEntry[]
  /** Whether another page exists after this response. */
  hasMore: boolean
  /** Offset to request for the next page. */
  nextOffset: number | null
  /** Total matching versions. */
  total: number
}

export interface VoicePackParams {
  [key: string]: string | number | boolean | null
}

export interface VoicePack {
  id: string
  name: string
  description: string | null
  provider: string
  model: string
  voiceId: string
  ttsModelId: string
  params: VoicePackParams
  costMultiplier: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface VoicePackPayload {
  name: string
  description?: string
  provider: string
  model: string
  voiceId: string
  ttsModelId: string
  params?: VoicePackParams
  costMultiplier: number
  enabled?: boolean
}

export interface SpeechModel {
  id: string
  name: string
}

export interface SpeechVoice {
  id: string
  name: string
  description?: string
  labels?: Record<string, unknown>
  tags?: string[]
  languages?: { code: string, title: string }[]
  preview_audio_url?: string
}

export interface SpeechVoicesResult {
  voices: SpeechVoice[]
  recommended: Record<string, string>
}

export interface SpeechTestPayload {
  model: string
  input: string
  voice: string
  speed?: number
  extra_body?: {
    voice_pack?: Record<string, unknown>
  }
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

export function apiServerUrl(): string {
  return getServerAdminBootstrapContext()?.apiServerUrl ?? defaultApiServerUrl()
}

/**
 * Builds an API-owned sign-in URL that returns to the exact admin page.
 *
 * Use when:
 * - The standalone admin app needs to bounce through the API auth route.
 * - The admin app may be hosted on a different origin than the auth UI.
 *
 * Expects:
 * - `currentUrl` is the browser's absolute admin URL.
 *
 * Returns:
 * - An API `/auth/sign-in` URL carrying an absolute trusted return target.
 */
export function buildAdminSignInUrl(apiServerUrl: string, currentUrl: string): string {
  const url = new URL('/auth/sign-in', apiServerUrl)
  url.searchParams.set('redirect', currentUrl)
  return url.toString()
}

export function signInUrl(): string {
  return buildAdminSignInUrl(apiServerUrl(), window.location.href)
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const endpoint = new URL(`/api/admin${path}`, apiServerUrl())
  return fetchJson<T>(endpoint, withDevelopmentAuth(init))
}

async function publicFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const endpoint = new URL(`/api/v1${path}`, apiServerUrl())
  return fetchJson<T>(endpoint, init)
}

/**
 * Reads the local-only admin bearer token for Vite development previews.
 */
export function developmentAdminBearerToken(): string | null {
  if (!import.meta.env.DEV)
    return null

  const token = import.meta.env.VITE_ADMIN_TEST_AUTH_TOKEN
  return typeof token === 'string' && token.trim() ? token.trim() : null
}

/**
 * Adds the local test auth header without changing production admin requests.
 */
export function withDevelopmentAuth(init: RequestInit = {}): RequestInit {
  const token = developmentAdminBearerToken()
  if (!token)
    return init

  const headers = new Headers(init.headers)
  if (!headers.has('Authorization'))
    headers.set('Authorization', `Bearer ${token}`)

  return {
    ...init,
    headers,
  }
}

async function fetchJson<T>(endpoint: URL, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')

  const response = await fetch(endpoint.toString(), {
    ...init,
    headers,
    credentials: 'include',
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  }
  catch {
    const contentType = response.headers.get('Content-Type')
    throw new AdminApiError(
      `Expected JSON from ${endpoint.pathname}, got ${contentType ?? 'an empty response'}. Check api_server_url.`,
      response.status,
      null,
    )
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? `Admin API request failed (${response.status})`
    throw new AdminApiError(message, response.status, payload)
  }

  return payload as T
}

async function publicFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const endpoint = new URL(`/api/v1${path}`, apiServerUrl())
  const headers = new Headers(init.headers)

  if (init.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')

  const response = await fetch(endpoint.toString(), {
    ...init,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    let payload: unknown = null
    try {
      payload = await response.json()
    }
    catch {
      payload = await response.text().catch(() => null)
    }
    const message = extractErrorMessage(payload) ?? `Audio API request failed (${response.status})`
    throw new AdminApiError(message, response.status, payload)
  }

  return await response.blob()
}

/**
 * Builds a query suffix from optional scalar parameters.
 *
 * Use when:
 * - Admin API methods expose list filters.
 * - Empty filter values should be omitted from the request URL.
 *
 * Expects:
 * - `params` contains only scalar values accepted by URLSearchParams.
 *
 * Returns:
 * - A `?key=value` suffix, or an empty string when no values are present.
 */
export function buildAdminQuerySuffix(params: Record<string, number | string | null | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '')
      query.set(key, String(value))
  }
  return query.toString() ? `?${query.toString()}` : ''
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object')
    return null
  const maybe = payload as { message?: unknown, error?: unknown }
  if (typeof maybe.message === 'string')
    return maybe.message
  if (typeof maybe.error === 'string')
    return maybe.error
  return null
}

export const adminApi = {
  me: () => shouldUseMockAdminApi() ? mockAdminMe() : adminFetch<AdminMe>('/me'),
  metrics: () => shouldUseMockAdminApi() ? mockAdminMetrics() : adminFetch<AdminMetrics>('/metrics'),
  productInsights: () => shouldUseMockAdminApi() ? mockAdminProductInsights() : adminFetch<AdminProductInsights>('/insights/product'),
  reliabilityInsights: () => shouldUseMockAdminApi() ? mockAdminReliabilityInsights() : adminFetch<AdminReliabilityInsights>('/insights/reliability'),
  health: () => shouldUseMockAdminApi() ? mockAdminHealth() : adminFetch<AdminHealthReport>('/health'),
  auditLogs: (params: { action?: string, limit?: number, offset?: number, risk?: string, status?: string }) => {
    if (shouldUseMockAdminApi())
      return mockAdminAuditLogs()

    const suffix = buildAdminQuerySuffix(params)
    return adminFetch<AdminAuditLogsPage>(`/audit-logs${suffix}`)
  },
  users: (params: { query?: string, limit?: number, offset?: number, sortDirection?: string, sortKey?: string, status?: string }) => {
    const suffix = buildAdminQuerySuffix(params)
    return adminFetch<AdminUsersPage>(`/users${suffix}`)
  },
  user: (id: string) => adminFetch<{ user: AdminUser, recentFluxTransactions: FluxTransaction[] }>(`/users/${encodeURIComponent(id)}`),
  grantUserFlux: (id: string, body: { amount: number, description: string, idempotencyKey?: string }) =>
    adminFetch<{ balanceBefore: number, balanceAfter: number, fluxTransactionId: string, idempotent: boolean }>(`/users/${encodeURIComponent(id)}/flux/grant`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  setUserFlux: (id: string, body: { balance: number, description: string }) =>
    adminFetch<{ balanceBefore: number, balanceAfter: number, fluxTransactionId: string | null, changed: boolean }>(`/users/${encodeURIComponent(id)}/flux`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  fluxGrantPreview: (body: { amount: number, description: string, emails: string[], idempotencyKey?: string }) =>
    adminFetch<unknown>('/flux-grants?dryRun=true', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  fluxGrant: (body: { amount: number, description: string, emails: string[], idempotencyKey?: string }) =>
    adminFetch<unknown>('/flux-grants', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  applyRouterConfig: (body: AdminRouterConfigRequest, dryRun: boolean) =>
    adminFetch<AdminRouterConfigResult>('/config/router', {
      method: 'POST',
      body: JSON.stringify({ ...body, dryRun }),
    }),
  routerConfig: () => adminFetch<AdminRouterConfigCurrent>('/config/router'),
  routerConfigHistory: (params: { limit?: number, offset?: number } = {}) => {
    const suffix = buildAdminQuerySuffix(params)
    return adminFetch<AdminRouterConfigHistoryPage>(`/config/router/history${suffix}`)
  },
  rollbackRouterConfig: (versionId: string) =>
    adminFetch<AdminRouterConfigResult>(`/config/router/history/${encodeURIComponent(versionId)}/rollback`, {
      method: 'POST',
    }),
  speechModels: async () => {
    const data = await publicFetch<{ models?: SpeechModel[] }>('/audio/models')
    return Array.isArray(data.models) ? data.models : []
  },
  speechVoices: async (model: string): Promise<SpeechVoicesResult> => {
    const query = new URLSearchParams()
    query.set('model', model)
    const data = await publicFetch<Partial<SpeechVoicesResult>>(`/audio/voices?${query.toString()}`)
    return {
      voices: Array.isArray(data.voices) ? data.voices : [],
      recommended: data.recommended && typeof data.recommended === 'object' ? data.recommended : {},
    }
  },
  testSpeech: (body: SpeechTestPayload) =>
    publicFetchBlob('/audio/speech', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  voicePacks: () => adminFetch<VoicePack[]>('/voice-packs'),
  createVoicePack: (body: VoicePackPayload) =>
    adminFetch<VoicePack>('/voice-packs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateVoicePack: (id: string, body: Partial<VoicePackPayload>) =>
    adminFetch<VoicePack>(`/voice-packs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  disableVoicePack: (id: string) =>
    adminFetch<VoicePack>(`/voice-packs/${encodeURIComponent(id)}/disable`, {
      method: 'POST',
    }),
}
