export interface Cip30Api {
  getNetworkId(): Promise<number>
  signTx(tx: string, partialSign?: boolean): Promise<string>
  submitTx(tx: string): Promise<string>
}

export interface Cip30WalletProvider {
  name: string
  icon: string
  apiVersion: string
  enable(opts?: { onlySilent?: boolean }): Promise<Cip30Api>
  isEnabled(): Promise<boolean>
}

declare global {
  interface Window {
    cardano?: Record<string, Cip30WalletProvider | unknown>
  }
}
