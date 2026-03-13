import { expect, test } from '@playwright/test'
import { createCallbackEvent } from './helpers/auth-oauth-callback'

test.describe('OAuth callback contract', () => {
  test('redirects successful exchange to root by default with success outcome signal', async () => {
    const event = createCallbackEvent({
      code: 'oauth-code',
      exchangeResult: { error: null },
    })

    const thrown = await event.invoke()

    expect(event.exchangeCalls).toEqual(['oauth-code'])
    expect(thrown?.constructor?.name).toBe('Redirect')
    expect(thrown.status).toBe(303)
    expect(thrown.location).toBe('/')
    expect(event.outcomeSignal()).toEqual({
      phase: 'callback',
      outcome: 'success',
      reason: 'session_exchanged',
      next: '/',
      nextWasSanitized: false,
    })
  })

  test('redirects successful exchange to a safe internal next path', async () => {
    const event = createCallbackEvent({
      code: 'oauth-code',
      next: '/admin/husstand',
      exchangeResult: { error: null },
    })

    const thrown = await event.invoke()

    expect(event.exchangeCalls).toEqual(['oauth-code'])
    expect(thrown?.constructor?.name).toBe('Redirect')
    expect(thrown.status).toBe(303)
    expect(thrown.location).toBe('/admin/husstand')
    expect(event.outcomeSignal()).toEqual({
      phase: 'callback',
      outcome: 'success',
      reason: 'session_exchanged',
      next: '/admin/husstand',
      nextWasSanitized: false,
    })
  })

  test('sanitizes unsafe next targets back to root on successful exchange', async () => {
    const event = createCallbackEvent({
      code: 'oauth-code',
      next: 'https://evil.example/steal-session',
      exchangeResult: { error: null },
    })

    const thrown = await event.invoke()

    expect(event.exchangeCalls).toEqual(['oauth-code'])
    expect(thrown?.constructor?.name).toBe('Redirect')
    expect(thrown.status).toBe(303)
    expect(thrown.location).toBe('/')
    expect(event.outcomeSignal()).toEqual({
      phase: 'callback',
      outcome: 'success',
      reason: 'session_exchanged',
      next: '/',
      nextWasSanitized: true,
    })
  })

  test('surfaces stable failure outcome when exchange fails', async () => {
    const event = createCallbackEvent({
      code: 'oauth-code',
      next: '/admin/husstand',
      exchangeResult: { error: { message: 'boom' } },
    })

    const thrown = await event.invoke()

    expect(event.exchangeCalls).toEqual(['oauth-code'])
    expect(thrown?.constructor?.name).toBe('Redirect')
    expect(thrown.status).toBe(303)
    expect(thrown.location).toBe('/auth/error?reason=oauth_callback_failed')
    expect(event.outcomeSignal()).toEqual({
      phase: 'callback',
      outcome: 'failure',
      reason: 'exchange_failed',
      next: '/admin/husstand',
      nextWasSanitized: false,
    })
  })

  test('surfaces stable failure outcome when no usable code is provided', async () => {
    const event = createCallbackEvent({
      next: '/admin/husstand',
      exchangeResult: { error: null },
    })

    const thrown = await event.invoke()

    expect(event.exchangeCalls).toEqual([])
    expect(thrown?.constructor?.name).toBe('Redirect')
    expect(thrown.status).toBe(303)
    expect(thrown.location).toBe('/auth/error?reason=oauth_callback_failed')
    expect(event.outcomeSignal()).toEqual({
      phase: 'callback',
      outcome: 'failure',
      reason: 'missing_code',
      next: '/admin/husstand',
      nextWasSanitized: false,
    })
  })
})
