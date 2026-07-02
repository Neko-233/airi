import type {
  AdminAuditLogsPage,
  AdminHealthReport,
  AdminMe,
  AdminMetrics,
  AdminProductInsights,
  AdminReliabilityInsights,
} from './api'

/**
 * Checks whether the standalone admin app should render local preview data.
 */
export function shouldUseMockAdminApi(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_ADMIN_USE_MOCK_API === 'true'
}

/**
 * Returns a deterministic ISO timestamp offset from the current preview time.
 */
function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

/**
 * Returns the local preview admin identity.
 */
export async function mockAdminMe(): Promise<AdminMe> {
  return {
    role: 'admin',
    user: {
      id: 'local-admin',
      name: 'Neko Operator',
      email: 'neko@example.com',
      emailVerified: true,
      image: null,
    },
  }
}

/**
 * Returns local preview metrics for the admin overview.
 */
export async function mockAdminMetrics(): Promise<AdminMetrics> {
  return {
    totalUsers: 3842,
    verifiedUsers: 3190,
    activeSessions: 927,
    currentFlux: 1482300,
    issuedFlux: 2910040,
    llmRequests24h: 18420,
    llmFlux24h: 31920,
    adminSeats: 3,
    grafanaEmbedUrl: null,
  }
}

/**
 * Returns local preview health checks and incidents.
 */
export async function mockAdminHealth(): Promise<AdminHealthReport> {
  return {
    status: 'degraded',
    checkedAt: isoMinutesAgo(2),
    checks: [
      {
        id: 'api',
        label: 'AIRI Server API',
        status: 'operational',
        detail: 'Core API routes are responding normally.',
        checkedAt: isoMinutesAgo(1),
        latencyMs: 82,
      },
      {
        id: 'redis',
        label: 'Redis / Queue',
        status: 'degraded',
        detail: 'Retry queue is elevated after bulk grant preview.',
        checkedAt: isoMinutesAgo(3),
        latencyMs: 143,
      },
      {
        id: 'tts',
        label: 'TTS Providers',
        status: 'degraded',
        detail: 'One speech probe exceeded latency threshold.',
        checkedAt: isoMinutesAgo(5),
        latencyMs: 612,
      },
      {
        id: 'database',
        label: 'Postgres',
        status: 'operational',
        detail: 'Connection pool is healthy.',
        checkedAt: isoMinutesAgo(2),
        latencyMs: 41,
      },
    ],
    incidents: [
      {
        id: 'inc-redis-retry',
        title: 'Flux grant retry pressure',
        severity: 'high',
        status: 'monitoring',
        startedAt: isoMinutesAgo(36),
        summary: 'Bulk grant preview generated elevated retry queue depth.',
      },
    ],
  }
}

/**
 * Returns local preview audit events for high-risk action review.
 */
export async function mockAdminAuditLogs(): Promise<AdminAuditLogsPage> {
  return {
    logs: [
      {
        id: 'audit-router-default',
        actor: {
          id: 'local-admin',
          name: 'Neko Operator',
          email: 'neko@example.com',
        },
        action: 'router.config.apply',
        targetType: 'router_config',
        targetId: 'router-current',
        targetLabel: 'OpenRouter chat default',
        risk: 'critical',
        status: 'success',
        summary: 'Applied OpenRouter chat default',
        metadata: { provider: 'openrouter' },
        createdAt: isoMinutesAgo(18),
      },
      {
        id: 'audit-flux-bulk',
        actor: {
          id: 'local-admin',
          name: 'Neko Operator',
          email: 'neko@example.com',
        },
        action: 'flux.grant.bulk',
        targetType: 'user_batch',
        targetId: null,
        targetLabel: '900 Flux promo batch',
        risk: 'high',
        status: 'success',
        summary: 'Bulk granted 900 Flux',
        metadata: { recipients: 12 },
        createdAt: isoMinutesAgo(44),
      },
    ],
    hasMore: false,
    nextOffset: null,
    total: 2,
  }
}

/**
 * Returns local preview PostHog product insight aggregates.
 */
export async function mockAdminProductInsights(): Promise<AdminProductInsights> {
  return {
    configured: true,
    source: 'posthog',
    windowDays: 7,
    dashboardUrl: 'https://us.posthog.com/project/90721/dashboard/1779029',
    updatedAt: isoMinutesAgo(4),
    errorMessage: null,
    metrics: [
      {
        id: 'activation_started_7d',
        label: 'Chat activations started',
        value: 410,
        unit: null,
        status: 'ok',
        description: 'Attempts to enter the chat activation path in the last 7 days.',
        href: null,
      },
      {
        id: 'activation_success_rate_7d',
        label: 'Activation success rate',
        value: 90,
        unit: '%',
        status: 'ok',
        description: 'Share of chat activation attempts that succeeded.',
        href: null,
      },
      {
        id: 'activation_failed_7d',
        label: 'Activation failures',
        value: 40,
        unit: null,
        status: 'warning',
        description: 'Activation attempts that failed before chat became usable.',
        href: null,
      },
      {
        id: 'provider_config_failed_7d',
        label: 'Provider config failures',
        value: 153,
        unit: null,
        status: 'warning',
        description: 'Provider setup errors that can block first chat.',
        href: null,
      },
      {
        id: 'tts_provider_selected_7d',
        label: 'TTS provider selected',
        value: 52,
        unit: null,
        status: 'ok',
        description: 'Provider selection changes from speech setup flows.',
        href: null,
      },
      {
        id: 'voice_selected_7d',
        label: 'Voice selected',
        value: 65,
        unit: null,
        status: 'ok',
        description: 'Voice choices made from speech or character flows.',
        href: null,
      },
      {
        id: 'voice_input_started_7d',
        label: 'Voice input started',
        value: 16,
        unit: null,
        status: 'ok',
        description: 'Microphone-driven conversation attempts.',
        href: null,
      },
      {
        id: 'mic_denied_7d',
        label: 'Microphone denied',
        value: 0,
        unit: null,
        status: 'ok',
        description: 'Permission denials that can stop voice activation.',
        href: null,
      },
    ],
    breakdowns: [
      {
        id: 'posthog_event_rollup',
        label: 'Event rollup',
        description: 'Raw event counts and unique users for tracked activation and voice signals.',
        items: [
          {
            id: 'chat_activation_started',
            label: 'Chat activations started',
            value: 410,
            unit: null,
            secondaryValue: '66 users · 37%',
            status: 'ok',
            description: 'Attempts to enter the chat activation path.',
            href: null,
          },
          {
            id: 'chat_activation_succeeded',
            label: 'Chat activations succeeded',
            value: 370,
            unit: null,
            secondaryValue: '62 users · 33%',
            status: 'ok',
            description: 'Activation attempts that reached a usable chat state.',
            href: null,
          },
          {
            id: 'chat_activation_failed',
            label: 'Chat activations failed',
            value: 40,
            unit: null,
            secondaryValue: '9 users · 4%',
            status: 'warning',
            description: 'Activation attempts that failed before chat became usable.',
            href: null,
          },
          {
            id: 'provider_config_failed',
            label: 'Provider config failures',
            value: 153,
            unit: null,
            secondaryValue: '10 users · 14%',
            status: 'warning',
            description: 'Provider setup errors that can block first chat.',
            href: null,
          },
          {
            id: 'tts_provider_selected',
            label: 'TTS provider selected',
            value: 52,
            unit: null,
            secondaryValue: '11 users · 5%',
            status: 'ok',
            description: 'Times users selected or changed a TTS provider.',
            href: null,
          },
          {
            id: 'voice_selected',
            label: 'Voice selected',
            value: 65,
            unit: null,
            secondaryValue: '10 users · 6%',
            status: 'ok',
            description: 'Voice choices made from speech or character flows.',
            href: null,
          },
          {
            id: 'voice_input_started',
            label: 'Voice input started',
            value: 16,
            unit: null,
            secondaryValue: '4 users · 1%',
            status: 'ok',
            description: 'Microphone-driven conversation attempts.',
            href: null,
          },
          {
            id: 'microphone_permission_denied',
            label: 'Microphone denied',
            value: 0,
            unit: null,
            secondaryValue: '0 users · 0%',
            status: 'ok',
            description: 'Permission denials that can stop voice activation.',
            href: null,
          },
        ],
      },
    ],
  }
}

/**
 * Returns local preview Grafana reliability insight aggregates.
 */
export async function mockAdminReliabilityInsights(): Promise<AdminReliabilityInsights> {
  return {
    configured: true,
    source: 'grafana',
    dashboardUrl: 'https://projairi.grafana.net/d/rbr55dn/airi-server-overview',
    updatedAt: isoMinutesAgo(3),
    errorMessage: null,
    metrics: [
      {
        id: 'grafana_alert_rules',
        label: 'Alert rules',
        value: 4,
        unit: null,
        status: 'ok',
        description: 'Grafana alert rules visible to the admin console.',
        href: null,
      },
      {
        id: 'grafana_active_rules',
        label: 'Active rules',
        value: 4,
        unit: null,
        status: 'ok',
        description: 'Rules currently evaluating in Grafana.',
        href: null,
      },
      {
        id: 'grafana_paused_rules',
        label: 'Paused rules',
        value: 0,
        unit: null,
        status: 'ok',
        description: 'Configured Grafana rules that are not actively evaluating.',
        href: null,
      },
      {
        id: 'grafana_rule_folders',
        label: 'Rule folders',
        value: 1,
        unit: null,
        status: 'ok',
        description: 'Grafana folders represented by returned alert rules.',
        href: null,
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
            value: 4,
            unit: null,
            secondaryValue: '100%',
            status: 'ok',
            description: 'Rules currently evaluating in Grafana.',
            href: null,
          },
          {
            id: 'paused',
            label: 'Paused',
            value: 0,
            unit: null,
            secondaryValue: '0%',
            status: 'ok',
            description: 'Rules configured but not actively evaluating.',
            href: null,
          },
        ],
      },
      {
        id: 'grafana_rule_folders',
        label: 'Rule folders',
        description: 'Returned alert rules grouped by Grafana folder.',
        items: [
          {
            id: 'grafana-synthetic-monitoring-app',
            label: 'grafana-synthetic-monitoring-app',
            value: 4,
            unit: null,
            secondaryValue: '100%',
            status: 'ok',
            description: '4 alert rules in this Grafana folder.',
            href: null,
          },
        ],
      },
    ],
    alertRules: [
      {
        id: 'probe-failed-10m',
        name: 'ProbeFailedExecutionsTooHigh [10m]',
        folder: 'grafana-synthetic-monitoring-app',
        state: 'active',
        href: null,
      },
      {
        id: 'probe-failed-5m',
        name: 'ProbeFailedExecutionsTooHigh [5m]',
        folder: 'grafana-synthetic-monitoring-app',
        state: 'active',
        href: null,
      },
      {
        id: 'http-duration-5m',
        name: 'HTTPRequestDurationTooHighAvg [5m]',
        folder: 'grafana-synthetic-monitoring-app',
        state: 'active',
        href: null,
      },
      {
        id: 'tls-cert-expiry',
        name: 'TLSCertExpiringCloseToExpiry',
        folder: 'grafana-synthetic-monitoring-app',
        state: 'active',
        href: null,
      },
    ],
  }
}
