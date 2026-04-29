import type { Cip30Api, Cip30WalletProvider } from '../types/cip30'

export interface DiscoveredWallet {
  key: string
  provider: Cip30WalletProvider
}

function isProvider(v: unknown): v is Cip30WalletProvider {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.enable === 'function' &&
    typeof o.name === 'string' &&
    typeof o.icon === 'string'
  )
}

export function listWallets(): DiscoveredWallet[] {
  const root = window.cardano
  if (!root) return []
  const out: DiscoveredWallet[] = []
  for (const [key, value] of Object.entries(root)) {
    if (isProvider(value)) out.push({ key, provider: value })
  }
  out.sort((a, b) => a.provider.name.localeCompare(b.provider.name))
  return out
}

export async function connect(key: string): Promise<Cip30Api> {
  const provider = window.cardano?.[key]
  if (!isProvider(provider)) throw new Error(`Wallet "${key}" not found`)
  return provider.enable()
}
