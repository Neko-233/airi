import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildAdminQuerySuffix, buildAdminSignInUrl, withDevelopmentAuth } from './api'

describe('ui-admin API URL helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds sign-in URLs with the absolute admin return URL', () => {
    expect(buildAdminSignInUrl(
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5178/llm-router?api_server_url=http%3A%2F%2F127.0.0.1%3A3000',
    )).toBe(
      'http://127.0.0.1:3000/auth/sign-in?redirect=http%3A%2F%2F127.0.0.1%3A5178%2Fllm-router%3Fapi_server_url%3Dhttp%253A%252F%252F127.0.0.1%253A3000',
    )
  })

  it('builds local dev sign-in URLs on the local API origin', () => {
    expect(buildAdminSignInUrl(
      'http://localhost:3000',
      'http://localhost:5178/',
    )).toBe(
      'http://localhost:3000/auth/sign-in?redirect=http%3A%2F%2Flocalhost%3A5178%2F',
    )
  })

  it('omits empty query values while preserving scalar filters', () => {
    expect(buildAdminQuerySuffix({
      action: '',
      limit: 20,
      offset: 40,
      risk: 'high',
      status: null,
    })).toBe('?limit=20&offset=40&risk=high')
  })

  it('returns an empty suffix when no query filters are present', () => {
    expect(buildAdminQuerySuffix({
      action: undefined,
      risk: '',
      status: null,
    })).toBe('')
  })

  it('adds the local development admin bearer token when configured', () => {
    vi.stubEnv('VITE_ADMIN_TEST_AUTH_TOKEN', 'local-admin-token')

    const init = withDevelopmentAuth()
    const headers = new Headers(init.headers)

    expect(headers.get('Authorization')).toBe('Bearer local-admin-token')
  })

  it('preserves an explicit Authorization header over the local development token', () => {
    vi.stubEnv('VITE_ADMIN_TEST_AUTH_TOKEN', 'local-admin-token')

    const init = withDevelopmentAuth({
      headers: {
        Authorization: 'Bearer existing-token',
      },
    })
    const headers = new Headers(init.headers)

    expect(headers.get('Authorization')).toBe('Bearer existing-token')
  })

  it('leaves requests unchanged when the local development token is blank', () => {
    vi.stubEnv('VITE_ADMIN_TEST_AUTH_TOKEN', '')

    const init = withDevelopmentAuth()
    const headers = new Headers(init.headers)

    expect(headers.has('Authorization')).toBe(false)
  })
})
