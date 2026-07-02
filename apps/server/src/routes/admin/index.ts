import type { Context } from 'hono'

import type { Database } from '../../libs/db'
import type { Env } from '../../libs/env'
import type { ConfigKVService } from '../../services/adapters/config-kv'
import type { BillingService } from '../../services/domain/billing/billing-service'
import type { HonoEnv } from '../../types/hono'

import { and, asc, count, desc, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { integer, maxLength, maxValue, minValue, nonEmpty, number, object, optional, pipe, safeParse, string } from 'valibot'

import { adminGuard } from '../../middlewares/admin-guard'
import { authGuard } from '../../middlewares/auth'
import { session as sessionTable, user as userTable } from '../../schemas/accounts'
import { userFlux } from '../../schemas/flux'
import { fluxTransaction } from '../../schemas/flux-transaction'
import { llmRequestLog } from '../../schemas/llm-request-log'
import { createBadRequestError, createNotFoundError } from '../../utils/error'
import { createQueryIntegerSchema } from '../../utils/http-query'

const MAX_FLUX_ADJUSTMENT = 1_000_000_000

const ListUsersQuerySchema = object({
  limit: createQueryIntegerSchema({
    defaultValue: 20,
    minimum: 1,
    maximum: 100,
  }),
  offset: createQueryIntegerSchema({
    defaultValue: 0,
    minimum: 0,
  }),
  query: optional(pipe(string(), maxLength(200)), ''),
  status: optional(pipe(string(), maxLength(20)), 'all'),
  sortKey: optional(pipe(string(), maxLength(40)), 'createdAt'),
  sortDirection: optional(pipe(string(), maxLength(10)), 'desc'),
})

const GrantUserFluxBodySchema = object({
  amount: pipe(number(), integer('amount must be an integer'), minValue(1, 'amount must be at least 1')),
  description: pipe(string(), nonEmpty('description is required'), maxLength(500)),
  idempotencyKey: optional(pipe(string(), maxLength(100))),
})

const SetUserFluxBodySchema = object({
  balance: pipe(
    number(),
    integer('balance must be an integer'),
    minValue(0, 'balance must be at least 0'),
    maxValue(MAX_FLUX_ADJUSTMENT, `balance must be at most ${MAX_FLUX_ADJUSTMENT}`),
  ),
  description: optional(pipe(string(), maxLength(500)), 'Admin balance adjustment'),
})

export interface AdminRoutesDeps {
  db: Database
  billingService: BillingService
  configKV: ConfigKVService
  env: Env
}

type AdminInsightStatus = 'ok' | 'warning' | 'critical' | 'unknown'

interface AdminInsightMetric {
  id: string
  label: string
  value: number | string
  unit: string | null
  status: AdminInsightStatus
  description: string
  href: string | null
}

interface AdminInsightBreakdownItem {
  id: string
  label: string
  value: number | string
  unit: string | null
  secondaryValue: string | null
  status: AdminInsightStatus
  description: string
  href: string | null
}

interface AdminInsightBreakdown {
  id: string
  label: string
  description: string
  items: AdminInsightBreakdownItem[]
}

interface AdminProductInsightsResponse {
  configured: boolean
  source: 'posthog'
  windowDays: number
  dashboardUrl: string | null
  metrics: AdminInsightMetric[]
  breakdowns: AdminInsightBreakdown[]
  updatedAt: string
  errorMessage: string | null
}

interface AdminReliabilityInsightRule {
  id: string
  name: string
  folder: string | null
  state: string | null
  href: string | null
}

interface AdminReliabilityInsightsResponse {
  configured: boolean
  source: 'grafana'
  dashboardUrl: string | null
  metrics: AdminInsightMetric[]
  breakdowns: AdminInsightBreakdown[]
  alertRules: AdminReliabilityInsightRule[]
  updatedAt: string
  errorMessage: string | null
}

const PRODUCT_INSIGHT_WINDOW_DAYS = 7

const PRODUCT_INSIGHT_EVENTS = [
  'chat_activation_started',
  'chat_activation_succeeded',
  'chat_activation_failed',
  'provider_config_failed',
  'tts_provider_selected',
  'voice_selected',
  'voice_input_started',
  'microphone_permission_denied',
] as const

const PRODUCT_INSIGHT_EVENT_SET = new Set<string>(PRODUCT_INSIGHT_EVENTS)

const PRODUCT_INSIGHT_EVENT_LABELS: Record<string, string> = {
  chat_activation_started: 'Chat activations started',
  chat_activation_succeeded: 'Chat activations succeeded',
  chat_activation_failed: 'Chat activations failed',
  provider_config_failed: 'Provider config failures',
  tts_provider_selected: 'TTS provider selected',
  voice_selected: 'Voice selected',
  voice_input_started: 'Voice input started',
  microphone_permission_denied: 'Microphone denied',
}

const PRODUCT_INSIGHT_EVENT_DESCRIPTIONS: Record<string, string> = {
  chat_activation_started: 'Attempts to enter the chat activation path.',
  chat_activation_succeeded: 'Activation attempts that reached a usable chat state.',
  chat_activation_failed: 'Activation attempts that failed before chat became usable.',
  provider_config_failed: 'Provider setup errors that can block first chat.',
  tts_provider_selected: 'Times users selected or changed a TTS provider.',
  voice_selected: 'Voice choices made from speech or character flows.',
  voice_input_started: 'Microphone-driven conversation attempts.',
  microphone_permission_denied: 'Permission denials that can stop voice activation.',
}

interface PostHogEventRollup {
  event: string
  events: number
  users: number
}

interface GrafanaAlertRule {
  uid?: string
  id?: number | string
  title?: string
  name?: string
  folderTitle?: string
  folderUID?: string
  ruleGroup?: string
  isPaused?: boolean
}

function serializeUser(row: {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: Date
  updatedAt: Date
  flux: number | null
  stripeCustomerId: string | null
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    flux: row.flux ?? 0,
    stripeCustomerId: row.stripeCustomerId,
  }
}

function userSortExpression(sortKey: string) {
  switch (sortKey) {
    case 'name':
      return userTable.name
    case 'email':
      return userTable.email
    case 'status':
      return userTable.emailVerified
    case 'flux':
      return sql<number>`coalesce(${userFlux.flux}, 0)`
    case 'createdAt':
      return userTable.createdAt
    default:
      throw createBadRequestError('Invalid sort key', 'INVALID_SORT_KEY', { sortKey })
  }
}

function userSortDirection(sortDirection: string) {
  switch (sortDirection) {
    case 'asc':
      return asc
    case 'desc':
      return desc
    default:
      throw createBadRequestError('Invalid sort direction', 'INVALID_SORT_DIRECTION', { sortDirection })
  }
}

function userStatusWhere(status: string) {
  switch (status) {
    case 'all':
      return undefined
    case 'verified':
      return eq(userTable.emailVerified, true)
    case 'unverified':
      return eq(userTable.emailVerified, false)
    default:
      throw createBadRequestError('Invalid status filter', 'INVALID_STATUS_FILTER', { status })
  }
}

async function readJson(c: Context<HonoEnv>): Promise<unknown> {
  const raw = await c.req.json().catch(() => null)
  if (raw == null)
    throw createBadRequestError('Request body must be JSON', 'INVALID_BODY')
  return raw
}

async function ensureUserExists(db: Database, userId: string) {
  const [target] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!target)
    throw createNotFoundError('User not found', { userId })
}

/**
 * Checks whether the PostHog integration has the minimum server-side secrets.
 */
function isPostHogConfigured(env: Env): boolean {
  return Boolean(env.POSTHOG_PROJECT_ID && env.POSTHOG_PERSONAL_API_KEY)
}

/**
 * Checks whether the Grafana integration has the minimum server-side secrets.
 */
function isGrafanaConfigured(env: Env): boolean {
  return Boolean(env.GRAFANA_URL && env.GRAFANA_SERVICE_ACCOUNT_TOKEN)
}

/**
 * Builds an absolute URL from a configured external service base.
 */
function externalServiceUrl(baseUrl: string, pathname: string): string {
  const url = new URL(pathname, baseUrl)
  return url.toString()
}

/**
 * Safely extracts PostHog result rows from the Query API response.
 */
function extractPostHogRows(payload: unknown): unknown[][] {
  if (!payload || typeof payload !== 'object')
    return []

  const directResults = (payload as { results?: unknown }).results
  if (Array.isArray(directResults))
    return directResults.filter(row => Array.isArray(row))

  const queryStatus = (payload as { query_status?: { results?: unknown } }).query_status
  if (queryStatus && Array.isArray(queryStatus.results))
    return queryStatus.results.filter(row => Array.isArray(row))

  return []
}

/**
 * Converts PostHog scalar values into numbers without trusting the payload shape.
 */
function numberFromPostHogCell(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Converts raw PostHog rows into event rollups used by admin product insights.
 */
function toPostHogRollups(rows: unknown[][]): PostHogEventRollup[] {
  return rows
    .map((row): PostHogEventRollup | null => {
      const event = typeof row[0] === 'string' ? row[0] : ''
      if (!PRODUCT_INSIGHT_EVENT_SET.has(event))
        return null

      return {
        event,
        events: numberFromPostHogCell(row[1]),
        users: numberFromPostHogCell(row[2]),
      }
    })
    .filter((row): row is PostHogEventRollup => row != null)
}

/**
 * Reads a numeric event count from normalized PostHog rollups.
 */
function eventCount(rollups: PostHogEventRollup[], event: string): number {
  return rollups.find(row => row.event === event)?.events ?? 0
}

/**
 * Formats a percentage as an operator-facing integer string.
 */
function formatPercent(numerator: number, denominator: number): string {
  if (denominator <= 0)
    return '0%'
  return `${Math.round((numerator / denominator) * 100)}%`
}

/**
 * Formats a count share as a compact percentage for breakdown rows.
 */
function formatShare(numerator: number, denominator: number): string {
  if (denominator <= 0)
    return '0%'
  return `${Math.round((numerator / denominator) * 100)}%`
}

/**
 * Queries PostHog HogQL through the server so browser clients never see tokens.
 */
async function queryPostHog(env: Env): Promise<PostHogEventRollup[]> {
  const query = `
    select event, count() as events, uniq(distinct_id) as users
    from events
    where timestamp >= now() - interval ${PRODUCT_INSIGHT_WINDOW_DAYS} day
      and event in (${PRODUCT_INSIGHT_EVENTS.map(event => `'${event}'`).join(', ')})
    group by event
  `

  const response = await fetch(externalServiceUrl(env.POSTHOG_HOST, `/api/projects/${encodeURIComponent(env.POSTHOG_PROJECT_ID)}/query/`), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'airi-admin-product-insights',
      query: {
        kind: 'HogQLQuery',
        query,
      },
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && typeof (payload as { detail?: unknown }).detail === 'string'
      ? (payload as { detail: string }).detail
      : `PostHog query failed with ${response.status}`
    throw new Error(detail)
  }

  return toPostHogRollups(extractPostHogRows(payload))
}

/**
 * Builds the PostHog product insight response for the admin UI.
 */
async function loadProductInsights(env: Env): Promise<AdminProductInsightsResponse> {
  if (!isPostHogConfigured(env)) {
    return {
      configured: false,
      source: 'posthog',
      windowDays: PRODUCT_INSIGHT_WINDOW_DAYS,
      dashboardUrl: env.POSTHOG_DASHBOARD_URL || null,
      metrics: [],
      breakdowns: [],
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    }
  }

  try {
    const rollups = await queryPostHog(env)
    const activationStarted = eventCount(rollups, 'chat_activation_started')
    const activationSucceeded = eventCount(rollups, 'chat_activation_succeeded')
    const activationFailed = eventCount(rollups, 'chat_activation_failed')
    const providerConfigFailed = eventCount(rollups, 'provider_config_failed')
    const ttsProviderSelected = eventCount(rollups, 'tts_provider_selected')
    const voiceSelected = eventCount(rollups, 'voice_selected')
    const voiceInputStarted = eventCount(rollups, 'voice_input_started')
    const microphoneDenied = eventCount(rollups, 'microphone_permission_denied')
    const totalEvents = rollups.reduce((total, row) => total + row.events, 0)

    return {
      configured: true,
      source: 'posthog',
      windowDays: PRODUCT_INSIGHT_WINDOW_DAYS,
      dashboardUrl: env.POSTHOG_DASHBOARD_URL || null,
      metrics: [
        {
          id: 'activation_started_7d',
          label: 'Chat activations started',
          value: activationStarted,
          unit: null,
          status: activationStarted > 0 ? 'ok' : 'unknown',
          description: 'User attempts to enter the chat activation path.',
          href: env.POSTHOG_DASHBOARD_URL || null,
        },
        {
          id: 'activation_success_rate_7d',
          label: 'Activation success rate',
          value: formatPercent(activationSucceeded, activationStarted),
          unit: null,
          status: activationStarted > 0 && activationSucceeded / activationStarted < 0.75 ? 'warning' : 'ok',
          description: `${activationSucceeded} succeeded, ${activationFailed} failed.`,
          href: env.POSTHOG_DASHBOARD_URL || null,
        },
        {
          id: 'activation_failed_7d',
          label: 'Activation failures',
          value: activationFailed,
          unit: null,
          status: activationFailed > 0 ? 'warning' : 'ok',
          description: 'Activation attempts that failed before chat became usable.',
          href: env.POSTHOG_DASHBOARD_URL || null,
        },
        {
          id: 'provider_config_failed_7d',
          label: 'Provider config failures',
          value: providerConfigFailed,
          unit: null,
          status: providerConfigFailed > 0 ? 'warning' : 'ok',
          description: 'Provider setup errors that can block first chat.',
          href: env.POSTHOG_DASHBOARD_URL || null,
        },
        {
          id: 'tts_provider_selected_7d',
          label: 'TTS provider selected',
          value: ttsProviderSelected,
          unit: null,
          status: ttsProviderSelected > 0 ? 'ok' : 'unknown',
          description: 'Provider selection changes from speech setup flows.',
          href: env.POSTHOG_DASHBOARD_URL || null,
        },
        {
          id: 'voice_selected_7d',
          label: 'Voice selected',
          value: voiceSelected,
          unit: null,
          status: voiceSelected > 0 ? 'ok' : 'unknown',
          description: 'Voice choices made from speech or character flows.',
          href: env.POSTHOG_DASHBOARD_URL || null,
        },
        {
          id: 'voice_input_started_7d',
          label: 'Voice input started',
          value: voiceInputStarted,
          unit: null,
          status: voiceInputStarted > 0 ? 'ok' : 'unknown',
          description: 'Microphone-driven conversation attempts.',
          href: env.POSTHOG_DASHBOARD_URL || null,
        },
        {
          id: 'mic_denied_7d',
          label: 'Microphone denied',
          value: microphoneDenied,
          unit: null,
          status: microphoneDenied > 0 ? 'warning' : 'ok',
          description: 'Permission denials that can stop voice activation.',
          href: env.POSTHOG_DASHBOARD_URL || null,
        },
      ],
      breakdowns: [
        {
          id: 'posthog_event_rollup',
          label: 'Event rollup',
          description: 'Raw event counts and unique users for the tracked activation and voice signals.',
          items: PRODUCT_INSIGHT_EVENTS.map((event) => {
            const rollup = rollups.find(row => row.event === event)
            const events = rollup?.events ?? 0
            return {
              id: event,
              label: PRODUCT_INSIGHT_EVENT_LABELS[event],
              value: events,
              unit: null,
              secondaryValue: `${rollup?.users ?? 0} users · ${formatShare(events, totalEvents)}`,
              status: events > 0 ? 'ok' : 'unknown',
              description: PRODUCT_INSIGHT_EVENT_DESCRIPTIONS[event],
              href: env.POSTHOG_DASHBOARD_URL || null,
            }
          }),
        },
        {
          id: 'activation_funnel',
          label: 'Activation funnel',
          description: 'The first-chat path split into started, succeeded, and blocked outcomes.',
          items: [
            {
              id: 'started',
              label: 'Started',
              value: activationStarted,
              unit: null,
              secondaryValue: '100%',
              status: activationStarted > 0 ? 'ok' : 'unknown',
              description: 'Users entered the activation path.',
              href: env.POSTHOG_DASHBOARD_URL || null,
            },
            {
              id: 'succeeded',
              label: 'Succeeded',
              value: activationSucceeded,
              unit: null,
              secondaryValue: formatPercent(activationSucceeded, activationStarted),
              status: activationStarted > 0 && activationSucceeded / activationStarted < 0.75 ? 'warning' : 'ok',
              description: 'Activation reached a usable chat state.',
              href: env.POSTHOG_DASHBOARD_URL || null,
            },
            {
              id: 'failed',
              label: 'Failed',
              value: activationFailed,
              unit: null,
              secondaryValue: formatPercent(activationFailed, activationStarted),
              status: activationFailed > 0 ? 'warning' : 'ok',
              description: 'Activation failed before chat became usable.',
              href: env.POSTHOG_DASHBOARD_URL || null,
            },
            {
              id: 'provider_blocked',
              label: 'Provider blocked',
              value: providerConfigFailed,
              unit: null,
              secondaryValue: formatPercent(providerConfigFailed, activationStarted),
              status: providerConfigFailed > 0 ? 'warning' : 'ok',
              description: 'Provider setup blocked or delayed first chat.',
              href: env.POSTHOG_DASHBOARD_URL || null,
            },
          ],
        },
      ],
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    }
  }
  catch (error) {
    return {
      configured: true,
      source: 'posthog',
      windowDays: PRODUCT_INSIGHT_WINDOW_DAYS,
      dashboardUrl: env.POSTHOG_DASHBOARD_URL || null,
      metrics: [],
      breakdowns: [],
      updatedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'PostHog query failed',
    }
  }
}

/**
 * Extracts a Grafana alert rule identifier suitable for links and row keys.
 */
function grafanaRuleId(rule: GrafanaAlertRule, index: number): string {
  return String(rule.uid ?? rule.id ?? `rule-${index}`)
}

/**
 * Maps Grafana provisioning API alert rules into admin row models.
 */
function toGrafanaRuleRows(env: Env, rules: GrafanaAlertRule[]): AdminReliabilityInsightRule[] {
  return rules.slice(0, 8).map((rule, index) => {
    const id = grafanaRuleId(rule, index)
    const name = rule.title ?? rule.name ?? id
    return {
      id,
      name,
      folder: rule.folderTitle ?? rule.folderUID ?? null,
      state: rule.isPaused ? 'paused' : 'active',
      href: rule.uid && env.GRAFANA_URL
        ? externalServiceUrl(env.GRAFANA_URL, `/alerting/grafana/${encodeURIComponent(rule.uid)}/view`)
        : env.GRAFANA_DASHBOARD_URL || null,
    }
  })
}

/**
 * Counts Grafana rules by folder title for reliability breakdowns.
 */
function countGrafanaRulesByFolder(rules: GrafanaAlertRule[]): AdminInsightBreakdownItem[] {
  const counts = new Map<string, number>()
  for (const rule of rules) {
    const folder = rule.folderTitle ?? rule.folderUID ?? 'Unassigned'
    counts.set(folder, (counts.get(folder) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([folder, count]) => ({
      id: folder,
      label: folder,
      value: count,
      unit: null,
      secondaryValue: null,
      status: 'ok',
      description: 'Grafana alert rules grouped by folder.',
      href: null,
    }))
}

/**
 * Loads Grafana alert rules through the server-side token boundary.
 */
async function queryGrafanaAlertRules(env: Env): Promise<GrafanaAlertRule[]> {
  const response = await fetch(externalServiceUrl(env.GRAFANA_URL, '/api/v1/provisioning/alert-rules'), {
    headers: {
      Authorization: `Bearer ${env.GRAFANA_SERVICE_ACCOUNT_TOKEN}`,
      Accept: 'application/json',
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && typeof (payload as { message?: unknown }).message === 'string'
      ? (payload as { message: string }).message
      : `Grafana alert rule query failed with ${response.status}`
    throw new Error(message)
  }

  return Array.isArray(payload) ? payload.filter((rule): rule is GrafanaAlertRule => Boolean(rule) && typeof rule === 'object') : []
}

/**
 * Builds the Grafana reliability insight response for the admin UI.
 */
async function loadReliabilityInsights(env: Env): Promise<AdminReliabilityInsightsResponse> {
  if (!isGrafanaConfigured(env)) {
    return {
      configured: false,
      source: 'grafana',
      dashboardUrl: env.GRAFANA_DASHBOARD_URL || null,
      metrics: [],
      breakdowns: [],
      alertRules: [],
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    }
  }

  try {
    const rules = await queryGrafanaAlertRules(env)
    const pausedRules = rules.filter(rule => rule.isPaused).length
    const activeRules = rules.length - pausedRules
    const folderBreakdown = countGrafanaRulesByFolder(rules)
    return {
      configured: true,
      source: 'grafana',
      dashboardUrl: env.GRAFANA_DASHBOARD_URL || null,
      metrics: [
        {
          id: 'grafana_alert_rules',
          label: 'Alert rules',
          value: rules.length,
          unit: null,
          status: rules.length > 0 ? 'ok' : 'unknown',
          description: 'Provisioned alert rules visible to the admin console.',
          href: env.GRAFANA_DASHBOARD_URL || null,
        },
        {
          id: 'grafana_active_rules',
          label: 'Active rules',
          value: activeRules,
          unit: null,
          status: activeRules > 0 ? 'ok' : 'unknown',
          description: 'Rules currently evaluating in Grafana.',
          href: env.GRAFANA_DASHBOARD_URL || null,
        },
        {
          id: 'grafana_paused_rules',
          label: 'Paused rules',
          value: pausedRules,
          unit: null,
          status: pausedRules > 0 ? 'warning' : 'ok',
          description: 'Rules that are configured but not actively evaluating.',
          href: env.GRAFANA_DASHBOARD_URL || null,
        },
        {
          id: 'grafana_rule_folders',
          label: 'Rule folders',
          value: folderBreakdown.length,
          unit: null,
          status: folderBreakdown.length > 0 ? 'ok' : 'unknown',
          description: 'Grafana folders represented by returned alert rules.',
          href: env.GRAFANA_DASHBOARD_URL || null,
        },
      ],
      breakdowns: [
        {
          id: 'grafana_rule_state',
          label: 'Rule state',
          description: 'How many returned rules are actively evaluating or paused.',
          items: [
            {
              id: 'active',
              label: 'Active',
              value: activeRules,
              unit: null,
              secondaryValue: formatShare(activeRules, rules.length),
              status: activeRules > 0 ? 'ok' : 'unknown',
              description: 'Rules currently evaluating in Grafana.',
              href: env.GRAFANA_DASHBOARD_URL || null,
            },
            {
              id: 'paused',
              label: 'Paused',
              value: pausedRules,
              unit: null,
              secondaryValue: formatShare(pausedRules, rules.length),
              status: pausedRules > 0 ? 'warning' : 'ok',
              description: 'Rules configured but not actively evaluating.',
              href: env.GRAFANA_DASHBOARD_URL || null,
            },
          ],
        },
        {
          id: 'grafana_rule_folders',
          label: 'Rule folders',
          description: 'Returned alert rules grouped by Grafana folder.',
          items: folderBreakdown,
        },
      ],
      alertRules: toGrafanaRuleRows(env, rules),
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    }
  }
  catch (error) {
    return {
      configured: true,
      source: 'grafana',
      dashboardUrl: env.GRAFANA_DASHBOARD_URL || null,
      metrics: [],
      breakdowns: [],
      alertRules: [],
      updatedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Grafana query failed',
    }
  }
}

export function createAdminRoutes(deps: AdminRoutesDeps) {
  return new Hono<HonoEnv>()
    .use('*', authGuard)
    .use('*', adminGuard)

    .get('/me', async (c) => {
      const user = c.get('user')!
      return c.json({
        role: 'admin',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
        },
      })
    })

    .get('/metrics', async (c) => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const [
        totalUsers,
        verifiedUsers,
        activeSessions,
        currentFlux,
        issuedFlux,
        llmRequests24h,
        llmFlux24h,
        adminUsers,
      ] = await Promise.all([
        deps.db.select({ count: count() }).from(userTable),
        deps.db.select({ count: count() }).from(userTable).where(eq(userTable.emailVerified, true)),
        deps.db.select({ count: count() }).from(sessionTable).where(gt(sessionTable.expiresAt, new Date())),
        deps.db.select({ total: sql<number>`coalesce(sum(${userFlux.flux}), 0)::int` }).from(userFlux).where(isNull(userFlux.deletedAt)),
        deps.db.select({ total: sql<number>`coalesce(sum(${fluxTransaction.amount}) filter (where ${fluxTransaction.type} in ('credit', 'initial', 'promo')), 0)::int` }).from(fluxTransaction),
        deps.db.select({ count: count() }).from(llmRequestLog).where(gt(llmRequestLog.createdAt, yesterday)),
        deps.db.select({ total: sql<number>`coalesce(sum(${llmRequestLog.fluxConsumed}), 0)::int` }).from(llmRequestLog).where(gt(llmRequestLog.createdAt, yesterday)),
        deps.db
          .select({ count: count() })
          .from(userTable)
          .where(sql<boolean>`'admin' = any(regexp_split_to_array(coalesce(${userTable.role}, ''), '\\s*,\\s*'))`),
      ])

      return c.json({
        totalUsers: Number(totalUsers[0]?.count ?? 0),
        verifiedUsers: Number(verifiedUsers[0]?.count ?? 0),
        activeSessions: Number(activeSessions[0]?.count ?? 0),
        currentFlux: Number(currentFlux[0]?.total ?? 0),
        issuedFlux: Number(issuedFlux[0]?.total ?? 0),
        llmRequests24h: Number(llmRequests24h[0]?.count ?? 0),
        llmFlux24h: Number(llmFlux24h[0]?.total ?? 0),
        adminSeats: Number(adminUsers[0]?.count ?? 0),
        grafanaEmbedUrl: null,
      })
    })

    .get('/insights/product', async (c) => {
      return c.json(await loadProductInsights(deps.env))
    })

    .get('/insights/reliability', async (c) => {
      return c.json(await loadReliabilityInsights(deps.env))
    })

    .get('/users', async (c) => {
      const query = safeParse(ListUsersQuerySchema, {
        limit: c.req.query('limit'),
        offset: c.req.query('offset'),
        query: c.req.query('query'),
        sortDirection: c.req.query('sortDirection'),
        sortKey: c.req.query('sortKey'),
        status: c.req.query('status'),
      })

      if (!query.success) {
        throw createBadRequestError('Invalid query', 'INVALID_QUERY', query.issues)
      }

      const search = query.output.query.trim()
      const searchWhere = search
        ? or(
            eq(userTable.id, search),
            ilike(userTable.email, `%${search}%`),
            ilike(userTable.name, `%${search}%`),
          )
        : undefined
      const statusWhere = userStatusWhere(query.output.status)
      const where = searchWhere && statusWhere
        ? and(searchWhere, statusWhere)
        : searchWhere ?? statusWhere
      const sort = userSortDirection(query.output.sortDirection)
      const sortExpression = userSortExpression(query.output.sortKey)

      const [rows, totalRows] = await Promise.all([
        deps.db
          .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            emailVerified: userTable.emailVerified,
            image: userTable.image,
            createdAt: userTable.createdAt,
            updatedAt: userTable.updatedAt,
            flux: userFlux.flux,
            stripeCustomerId: userFlux.stripeCustomerId,
          })
          .from(userTable)
          .leftJoin(userFlux, and(
            eq(userTable.id, userFlux.userId),
            isNull(userFlux.deletedAt),
          ))
          .where(where)
          .orderBy(sort(sortExpression), desc(userTable.createdAt))
          .limit(query.output.limit + 1)
          .offset(query.output.offset),
        deps.db
          .select({ count: count() })
          .from(userTable)
          .where(where),
      ])

      const hasMore = rows.length > query.output.limit
      if (hasMore)
        rows.pop()

      return c.json({
        users: rows.map(serializeUser),
        hasMore,
        nextOffset: hasMore ? query.output.offset + query.output.limit : null,
        total: Number(totalRows[0]?.count ?? 0),
      })
    })

    .get('/users/:id', async (c) => {
      const id = c.req.param('id')

      const [row] = await deps.db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          emailVerified: userTable.emailVerified,
          image: userTable.image,
          createdAt: userTable.createdAt,
          updatedAt: userTable.updatedAt,
          flux: userFlux.flux,
          stripeCustomerId: userFlux.stripeCustomerId,
        })
        .from(userTable)
        .leftJoin(userFlux, and(
          eq(userTable.id, userFlux.userId),
          isNull(userFlux.deletedAt),
        ))
        .where(eq(userTable.id, id))
        .limit(1)

      if (!row)
        throw createNotFoundError('User not found', { id })

      const transactions = await deps.db.query.fluxTransaction.findMany({
        where: eq(fluxTransaction.userId, id),
        orderBy: [desc(fluxTransaction.createdAt)],
        limit: 20,
      })

      return c.json({
        user: serializeUser(row),
        recentFluxTransactions: transactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          balanceBefore: tx.balanceBefore,
          balanceAfter: tx.balanceAfter,
          description: tx.description,
          metadata: tx.metadata,
          createdAt: tx.createdAt.toISOString(),
        })),
      })
    })

    .post('/users/:id/flux/grant', async (c) => {
      const actor = c.get('user')!
      const userId = c.req.param('id')
      await ensureUserExists(deps.db, userId)

      const parsed = safeParse(GrantUserFluxBodySchema, await readJson(c))
      if (!parsed.success) {
        throw createBadRequestError('Invalid request body', 'INVALID_BODY', parsed.issues)
      }

      const result = await deps.billingService.creditFlux({
        userId,
        amount: parsed.output.amount,
        requestId: parsed.output.idempotencyKey,
        description: parsed.output.description,
        source: 'admin.user_grant',
        type: 'promo',
        auditMetadata: {
          source: 'admin.user_grant',
          issuedByUserId: actor.id,
        },
      })

      return c.json(result)
    })

    .patch('/users/:id/flux', async (c) => {
      const actor = c.get('user')!
      const userId = c.req.param('id')
      await ensureUserExists(deps.db, userId)

      const parsed = safeParse(SetUserFluxBodySchema, await readJson(c))
      if (!parsed.success) {
        throw createBadRequestError('Invalid request body', 'INVALID_BODY', parsed.issues)
      }

      const result = await deps.billingService.setFlux({
        userId,
        balance: parsed.output.balance,
        description: parsed.output.description,
        issuedByUserId: actor.id,
      })

      return c.json({
        ...result,
        changed: result.balanceBefore !== result.balanceAfter,
      })
    })
}
