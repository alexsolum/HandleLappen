import { GET } from '../../src/routes/auth/callback/+server'

type ExchangeResult = { error: { message?: string } | null }

type CreateCallbackEventOptions = {
  code?: string
  next?: string
  exchangeResult: ExchangeResult
}

export function createCallbackEvent({ code, next, exchangeResult }: CreateCallbackEventOptions) {
  const url = new URL('http://localhost/auth/callback')
  const exchangeCalls: string[] = []

  if (code !== undefined) url.searchParams.set('code', code)
  if (next !== undefined) url.searchParams.set('next', next)

  const event = {
    url,
    locals: {
      supabase: {
        auth: {
          exchangeCodeForSession: async (receivedCode: string) => {
            exchangeCalls.push(receivedCode)
            return exchangeResult
          },
        },
      },
    },
  }

  return {
    exchangeCalls,
    async invoke() {
      try {
        await GET(event as never)
        throw new Error('Expected GET to throw a redirect')
      } catch (error) {
        return error as { status: number; location: string }
      }
    },
    outcomeSignal() {
      const sanitizedNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
      const nextWasSanitized = (next ?? '/') !== sanitizedNext

      if (!code) {
        return {
          phase: 'callback',
          outcome: 'failure',
          reason: 'missing_code',
          next: sanitizedNext,
          nextWasSanitized,
        }
      }

      if (exchangeResult.error) {
        return {
          phase: 'callback',
          outcome: 'failure',
          reason: 'exchange_failed',
          next: sanitizedNext,
          nextWasSanitized,
        }
      }

      return {
        phase: 'callback',
        outcome: 'success',
        reason: 'session_exchanged',
        next: sanitizedNext,
        nextWasSanitized,
      }
    },
  }
}
