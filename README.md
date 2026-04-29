# sign-tx

A minimal web app that connects to a Cardano CIP-30 wallet, signs a hex-encoded
unsigned transaction with `signTx`, and submits the signed result with `submitTx`.

## Prerequisites

- Node.js (see `.nvmrc`)
- A CIP-30 browser wallet extension (Lace, Eternl, Nami, Yoroi, Typhon, etc.)

## Run

```sh
npm install
npm run dev
```

Open the printed local URL, connect a wallet, paste a hex-encoded unsigned
transaction (CBOR), click **Sign**, then **Submit**. After submission a
Cardanoscan link is shown for the resulting transaction ID (mainnet or preprod
based on the wallet's reported network).

## Build

```sh
npm run build
npm run preview
```
