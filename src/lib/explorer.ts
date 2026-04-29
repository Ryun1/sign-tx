export function txUrl(networkId: number, txId: string): string {
  const host = networkId === 1 ? 'cardanoscan.io' : 'preprod.cardanoscan.io'
  return `https://${host}/transaction/${txId}`
}

export function networkLabel(networkId: number): string {
  return networkId === 1 ? 'mainnet' : 'testnet'
}
