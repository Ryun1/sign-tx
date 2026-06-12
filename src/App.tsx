import { useEffect, useMemo, useState } from 'react'
import type { Cip30Api } from './types/cip30'
import { listWallets, connect, type DiscoveredWallet } from './lib/wallets'
import { isLikelyHex, mergeWitness } from './lib/csl'
import { networkLabel, txUrl } from './lib/explorer'

type StatusKind = 'idle' | 'busy' | 'ok' | 'error'
type Status = { kind: StatusKind; message?: string }

const idle: Status = { kind: 'idle' }

function describeError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

function StatusBanner({ status }: { status: Status }) {
  if (status.kind === 'idle') return null
  const styles: Record<Exclude<StatusKind, 'idle'>, string> = {
    busy: 'bg-slate-700/40 text-slate-200 border-slate-600',
    ok: 'bg-emerald-900/40 text-emerald-200 border-emerald-700',
    error: 'bg-rose-900/40 text-rose-200 border-rose-700',
  }
  return (
    <div
      className={`mt-3 rounded-md border px-3 py-2 text-sm break-words ${styles[status.kind]}`}
    >
      {status.message}
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // ignore
        }
      }}
      className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function Section({
  step,
  title,
  disabled,
  children,
}: {
  step: number
  title: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={`rounded-xl border border-slate-700 bg-slate-900/60 p-5 ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      <h2 className="text-lg font-semibold text-slate-100">
        <span className="mr-2 text-slate-400">{step}.</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default function App() {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [api, setApi] = useState<Cip30Api | null>(null)
  const [connectedName, setConnectedName] = useState<string>('')
  const [networkId, setNetworkId] = useState<number | null>(null)

  const [unsignedHex, setUnsignedHex] = useState('')
  const [partialSign, setPartialSign] = useState(false)
  const [signedHex, setSignedHex] = useState<string | null>(null)
  const [txId, setTxId] = useState<string | null>(null)

  const [connectStatus, setConnectStatus] = useState<Status>(idle)
  const [signStatus, setSignStatus] = useState<Status>(idle)
  const [submitStatus, setSubmitStatus] = useState<Status>(idle)

  useEffect(() => {
    const found = listWallets()
    setWallets(found)
    if (found.length === 0) {
      setConnectStatus({
        kind: 'error',
        message:
          'No CIP-30 wallets detected. Install a Cardano wallet extension (Lace, Eternl, Nami, etc.) and reload.',
      })
    }
  }, [])

  const canSign = api !== null && unsignedHex.trim().length > 0
  const canSubmit = api !== null && signedHex !== null

  async function onConnect(w: DiscoveredWallet) {
    setConnectStatus({ kind: 'busy', message: `Connecting to ${w.provider.name}…` })
    try {
      const newApi = await connect(w.key)
      const net = await newApi.getNetworkId()
      setApi(newApi)
      setConnectedName(w.provider.name)
      setNetworkId(net)
      setConnectStatus({
        kind: 'ok',
        message: `Connected to ${w.provider.name} on ${networkLabel(net)} (networkId=${net}).`,
      })
    } catch (e) {
      setConnectStatus({ kind: 'error', message: describeError(e) })
    }
  }

  async function onSign() {
    if (!api) return
    const hex = unsignedHex.trim()
    if (!isLikelyHex(hex)) {
      setSignStatus({
        kind: 'error',
        message:
          'Input does not look like hex (must be even length, only 0-9 and a-f).',
      })
      return
    }
    setSignStatus({ kind: 'busy', message: 'Awaiting wallet signature…' })
    setSignedHex(null)
    setTxId(null)
    setSubmitStatus(idle)
    try {
      const witnessHex = await api.signTx(hex, partialSign)
      const merged = mergeWitness(hex, witnessHex)
      setSignedHex(merged)
      setSignStatus({ kind: 'ok', message: 'Transaction signed.' })
    } catch (e) {
      setSignStatus({ kind: 'error', message: describeError(e) })
    }
  }

  async function onSubmit() {
    if (!api || !signedHex) return
    setSubmitStatus({ kind: 'busy', message: 'Submitting transaction…' })
    try {
      const id = await api.submitTx(signedHex)
      setTxId(id)
      setSubmitStatus({ kind: 'ok', message: 'Submitted.' })
    } catch (e) {
      setSubmitStatus({ kind: 'error', message: describeError(e) })
    }
  }

  const explorerHref = useMemo(
    () => (txId && networkId !== null ? txUrl(networkId, txId) : null),
    [txId, networkId],
  )

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-slate-50">CIP-30 Sign &amp; Submit</h1>
          <p className="mt-1 text-sm text-slate-400">
            Connect a Cardano wallet, paste a hex-encoded unsigned transaction, sign it,
            and submit it.
          </p>
        </header>

        <Section step={1} title="Connect wallet">
          {api ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-200">
                <div className="font-medium">{connectedName}</div>
                {networkId !== null && (
                  <div className="text-slate-400">
                    {networkLabel(networkId)} (networkId={networkId})
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setApi(null)
                  setConnectedName('')
                  setNetworkId(null)
                  setSignedHex(null)
                  setTxId(null)
                  setSignStatus(idle)
                  setSubmitStatus(idle)
                  setConnectStatus(idle)
                }}
                className="text-xs px-3 py-1.5 rounded border border-slate-600 hover:bg-slate-800"
              >
                Disconnect
              </button>
            </div>
          ) : wallets.length === 0 ? (
            <p className="text-sm text-slate-400">No wallets detected.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {wallets.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  disabled={connectStatus.kind === 'busy'}
                  onClick={() => onConnect(w)}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-left hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <img
                    src={w.provider.icon}
                    alt=""
                    className="h-6 w-6 rounded"
                  />
                  <span className="text-sm text-slate-100">{w.provider.name}</span>
                </button>
              ))}
            </div>
          )}
          <StatusBanner status={connectStatus} />
        </Section>

        <Section step={2} title="Sign transaction" disabled={!api}>
          <label className="block text-sm text-slate-300">
            Unsigned transaction (hex / CBOR)
          </label>
          <textarea
            value={unsignedHex}
            onChange={(e) => setUnsignedHex(e.target.value)}
            disabled={!api}
            rows={8}
            spellCheck={false}
            placeholder="84a40081825820…"
            className="mt-1 w-full font-mono text-xs rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 disabled:opacity-60"
          />
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={partialSign}
              onChange={(e) => setPartialSign(e.target.checked)}
              disabled={!api}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950 accent-indigo-600 disabled:opacity-60"
            />
            Partial sign
            <span className="text-slate-500">
              (don&apos;t require all witnesses; for multi-sig)
            </span>
          </label>
          <button
            type="button"
            onClick={onSign}
            disabled={!canSign || signStatus.kind === 'busy'}
            className="mt-3 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signStatus.kind === 'busy' ? 'Signing…' : 'Sign transaction'}
          </button>
          <StatusBanner status={signStatus} />
          {signedHex && (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">Signed transaction (hex)</div>
                <CopyButton value={signedHex} />
              </div>
              <pre className="mt-1 max-h-48 overflow-auto rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 whitespace-pre-wrap break-all">
                {signedHex}
              </pre>
            </div>
          )}
        </Section>

        <Section step={3} title="Submit transaction" disabled={!canSubmit}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || submitStatus.kind === 'busy'}
            className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitStatus.kind === 'busy' ? 'Submitting…' : 'Submit transaction'}
          </button>
          <StatusBanner status={submitStatus} />
          {txId && (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-slate-300">Transaction ID</div>
                <CopyButton value={txId} />
              </div>
              <div className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 break-all">
                {txId}
              </div>
              {explorerHref && (
                <a
                  href={explorerHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-block text-sm text-indigo-300 hover:text-indigo-200 underline"
                >
                  View on Cardanoscan →
                </a>
              )}
            </div>
          )}
        </Section>

        <footer className="pt-4 text-center text-xs text-slate-500">
          Uses CIP-30 <code className="font-mono">signTx</code> +{' '}
          <code className="font-mono">submitTx</code>.
        </footer>
      </div>
    </div>
  )
}
