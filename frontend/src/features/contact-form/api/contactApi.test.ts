import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type emailjs from '@emailjs/browser'
import { ContactNotConfiguredError, ContactTimeoutError, sendContactMessage } from './contactApi'

const mockedSend = vi.fn<typeof emailjs.send>()
const sdk = { default: { send: mockedSend } }
const message = { name: 'Ada', email: 'ada@example.com', message: 'Hello' }

// A per-test module factory keeps the actual dynamic import in the test, including its wait.
const delaySdkLoad = () => {
  let finish: () => void
  const loaded = new Promise<typeof sdk>((resolve) => {
    finish = () => resolve(sdk)
  })
  vi.doMock('@emailjs/browser', () => loaded)
  return () => finish()
}

const configure = () => {
  vi.stubEnv('VITE_EMAILJS_SERVICE_ID', 'service_test')
  vi.stubEnv('VITE_EMAILJS_TEMPLATE_ID', 'template_test')
  vi.stubEnv('VITE_EMAILJS_PUBLIC_KEY', 'public_test')
}

describe('sendContactMessage', () => {
  beforeEach(() => {
    mockedSend.mockReset()
    vi.useFakeTimers()
    vi.doMock('@emailjs/browser', () => sdk)
  })

  afterEach(() => {
    vi.doUnmock('@emailjs/browser')
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('refuses to send when EmailJS is not configured', async () => {
    vi.stubEnv('VITE_EMAILJS_SERVICE_ID', '')

    await expect(sendContactMessage(message)).rejects.toBeInstanceOf(ContactNotConfiguredError)
    expect(mockedSend).not.toHaveBeenCalled()
  })

  it('sends the message with an unambiguous timestamp, headless blocking and a rate limit', async () => {
    configure()
    mockedSend.mockResolvedValueOnce({ status: 200, text: 'OK' })

    await sendContactMessage(message)

    const [serviceId, templateId, params, options] = mockedSend.mock.calls[0]
    expect([serviceId, templateId]).toEqual(['service_test', 'template_test'])
    expect(params).toMatchObject(message)
    expect(String(params?.time)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(options).toMatchObject({ publicKey: 'public_test', blockHeadless: true, limitRate: { throttle: 10000 } })
  })

  it('gives up after the timeout with a dedicated error', async () => {
    configure()
    mockedSend.mockReturnValueOnce(new Promise(() => {}))

    const sending = sendContactMessage(message)
    const outcome = expect(sending).rejects.toBeInstanceOf(ContactTimeoutError)
    await vi.advanceTimersByTimeAsync(15000)

    await outcome
  })

  it('times out a pending SDK load and never sends when it eventually finishes', async () => {
    configure()
    const finishLoading = delaySdkLoad()
    const sending = sendContactMessage(message)
    const outcome = expect(sending).rejects.toBeInstanceOf(ContactTimeoutError)

    await vi.advanceTimersByTimeAsync(15000)
    await outcome
    expect(mockedSend).not.toHaveBeenCalled()

    finishLoading()
    await import('@emailjs/browser')
    await vi.advanceTimersByTimeAsync(0)

    expect(mockedSend).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shares one deadline between loading the SDK and waiting for the send', async () => {
    configure()
    const finishLoading = delaySdkLoad()
    mockedSend.mockReturnValueOnce(new Promise(() => {}))
    const sending = sendContactMessage(message)
    const outcome = expect(sending).rejects.toBeInstanceOf(ContactTimeoutError)
    const completed = vi.fn()
    void sending.then(completed, completed)

    await vi.advanceTimersByTimeAsync(9000)
    finishLoading()
    await import('@emailjs/browser')
    await vi.advanceTimersByTimeAsync(0)
    expect(mockedSend).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5999)
    expect(completed).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    await outcome
    expect(vi.getTimerCount()).toBe(0)
  })

  it('refuses to start sending past the deadline even before the timeout callback can run', async () => {
    configure()
    const finishLoading = delaySdkLoad()
    const deadline = performance.now() + 15000
    const sending = sendContactMessage(message)
    const outcome = expect(sending).rejects.toBeInstanceOf(ContactTimeoutError)

    // A busy event loop can delay the timer while the monotonic deadline has already passed.
    vi.spyOn(performance, 'now').mockReturnValue(deadline + 1)
    finishLoading()

    await outcome
    expect(mockedSend).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('propagates a failed send and releases its deadline timer', async () => {
    configure()
    const failure = new Error('network unavailable')
    mockedSend.mockRejectedValueOnce(failure)

    await expect(sendContactMessage(message)).rejects.toBe(failure)

    expect(vi.getTimerCount()).toBe(0)
  })
})
