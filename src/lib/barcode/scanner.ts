import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  type Html5QrcodeCameraScanConfig,
  type Html5QrcodeError,
  type Html5QrcodeResult,
} from 'html5-qrcode'

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
] as const

type ScannerStatus = 'idle' | 'starting' | 'running' | 'stopping'

export type SupportedBarcodeFormat = 'EAN_13' | 'EAN_8' | 'UPC_A' | 'UPC_E'

export type ScannerErrorReason = 'permission-denied' | 'camera-failure'

export class ScannerError extends Error {
  reason: ScannerErrorReason

  constructor(reason: ScannerErrorReason, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ScannerError'
    this.reason = reason
  }
}

type ScannerInstance = Pick<Html5Qrcode, 'clear' | 'stop'> & {
  isScanning?: boolean
}

type MockScannerHandle = {
  stop?: () => Promise<void> | void
  clear?: () => Promise<void> | void
}

type MockScannerController = {
  start: (options: StartScannerOptions) => Promise<MockScannerHandle | void> | MockScannerHandle | void
}

export type ScannerSession = {
  scanner: ScannerInstance
  elementId: string
  status: ScannerStatus
  stopped: boolean
  lastValue: string | null
}

export type StartScannerOptions = {
  elementId: string
  onDetected: (ean: string) => void | Promise<void>
  onError?: (error: ScannerError) => void | Promise<void>
}

declare global {
  interface Window {
    __HANDLEAPPEN_BARCODE_SCANNER_MOCK__?: MockScannerController
  }
}

function normalizeRetailBarcode(value: string): string | null {
  const digitsOnly = value.replace(/\D/g, '')

  if (!digitsOnly) return null
  if (![8, 12, 13].includes(digitsOnly.length)) return null

  return digitsOnly
}

function inferErrorReason(error: unknown): ScannerErrorReason {
  const message = String(error ?? '').toLowerCase()
  if (
    message.includes('permission') ||
    message.includes('notallowederror') ||
    message.includes('denied') ||
    message.includes('notallowed')
  ) {
    return 'permission-denied'
  }

  return 'camera-failure'
}

function toScannerError(error: unknown): ScannerError {
  const reason = inferErrorReason(error)
  const message =
    error instanceof Error
      ? error.message
      : reason === 'permission-denied'
        ? 'Kameratilgang ble avslatt.'
        : 'Kameraet kunne ikke startes.'

  return new ScannerError(reason, message, { cause: error })
}

function isSupportedResult(result: Html5QrcodeResult | null | undefined): boolean {
  const format = result?.result?.format?.formatName
  return format != null && getSupportedFormats().includes(format as SupportedBarcodeFormat)
}

function getScanConfig(): Html5QrcodeCameraScanConfig {
  return {
    fps: 10,
    qrbox: { width: 240, height: 140 },
    formatsToSupport: [...SUPPORTED_FORMATS],
    aspectRatio: 1.7777778,
    disableFlip: false,
    rememberLastUsedCamera: false,
    showTorchButtonIfSupported: true,
    videoConstraints: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  }
}

export function getSupportedFormats(): SupportedBarcodeFormat[] {
  return ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E']
}

export async function startScanner({
  elementId,
  onDetected,
  onError,
}: StartScannerOptions): Promise<ScannerSession> {
  const mockController = typeof window !== 'undefined' ? window.__HANDLEAPPEN_BARCODE_SCANNER_MOCK__ : undefined
  const scanner = mockController
    ? ({
        isScanning: true,
        stop: async () => {},
        clear: async () => {},
      } satisfies ScannerInstance)
    : new Html5Qrcode(elementId, {
        formatsToSupport: [...SUPPORTED_FORMATS],
        verbose: false,
      })
  const session: ScannerSession = {
    scanner,
    elementId,
    status: 'starting',
    stopped: false,
    lastValue: null,
  }

  try {
    if (mockController) {
      const mockHandle = (await mockController.start({ elementId, onDetected, onError })) ?? {}
      session.scanner = {
        isScanning: true,
        stop: async () => {
          await mockHandle.stop?.()
        },
        clear: async () => {
          await mockHandle.clear?.()
        },
      }
    } else {
      await scanner.start(
        { facingMode: { ideal: 'environment' } },
        getScanConfig(),
        async (decodedText: string, result: Html5QrcodeResult) => {
          if (session.stopped || session.status === 'stopping') return
          if (!isSupportedResult(result)) return

          const normalized = normalizeRetailBarcode(decodedText)
          if (!normalized || normalized === session.lastValue) return

          session.lastValue = normalized
          session.status = 'stopping'

          await stopScanner(session)
          await onDetected(normalized)
        },
        (_errorMessage: string, _error?: Html5QrcodeError) => {
          // Frame-level decode misses are expected; ignore until a valid retail barcode is found.
        }
      )
    }

    session.status = 'running'

    const region = document.getElementById(elementId)
    const video = region?.querySelector('video')
    if (video instanceof HTMLVideoElement) {
      video.setAttribute('playsinline', 'true')
      video.setAttribute('muted', 'true')
      video.muted = true
    }

    return session
  } catch (error) {
    session.stopped = true
    session.status = 'idle'
    const scannerError = toScannerError(error)
    await onError?.(scannerError)
    throw scannerError
  }
}

export async function stopScanner(session: ScannerSession | null | undefined): Promise<void> {
  if (!session || session.stopped) return

  session.stopped = true
  session.status = 'stopping'

  try {
    if (session.scanner.isScanning ?? true) {
      await session.scanner.stop()
    }
  } finally {
    await session.scanner.clear()
    session.status = 'idle'
  }
}

export function bindVisibilityCleanup(stop: () => void | Promise<void>): () => void {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void stop()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}

export function createRouteCleanup(stop: () => void | Promise<void>): () => void {
  return () => {
    void stop()
  }
}
