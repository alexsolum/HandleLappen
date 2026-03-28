export const CHAIN_OPTIONS = [
  'Rema 1000',
  'Kiwi',
  'Meny',
  'Coop Extra',
  'Coop Mega',
  'Coop Prix',
  'Spar',
  'Joker',
  'Bunnpris',
  'Annet',
] as const

export type ChainName = (typeof CHAIN_OPTIONS)[number]

export const CHAIN_COLORS: Record<string, string> = {
  'Rema 1000': '#003087',
  Kiwi: '#00843D',
  Meny: '#E4002B',
  'Coop Extra': '#FFD100',
  'Coop Mega': '#003087',
  'Coop Prix': '#E4002B',
  Spar: '#007A3D',
  Joker: '#FFD100',
  Bunnpris: '#E85D04',
}

export function storeDisplayName(chain: string | null | undefined, locationName: string): string {
  if (!chain || chain === 'Annet') return locationName
  return `${chain} ${locationName}`
}
