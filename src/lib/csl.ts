import * as CSL from '@emurgo/cardano-serialization-lib-browser'

export function isLikelyHex(s: string): boolean {
  const t = s.replace(/\s+/g, '')
  return t.length > 0 && t.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(t)
}

export function mergeWitness(unsignedTxHex: string, witnessHex: string): string {
  const fixedTx = CSL.FixedTransaction.from_hex(unsignedTxHex)
  const ws = CSL.TransactionWitnessSet.from_hex(witnessHex)
  const vkeys = ws.vkeys()
  if (vkeys) {
    for (let i = 0; i < vkeys.len(); i++) {
      fixedTx.add_vkey_witness(vkeys.get(i))
    }
  }
  return fixedTx.to_hex()
}
