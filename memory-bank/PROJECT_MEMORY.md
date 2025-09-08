Project Memory Bank

Overview
- Language/Stack: TypeScript, Node.js
- Key libs: bitcoinjs-lib, ecpair, tiny-secp256k1, axios
- Network default: testnet (Blockstream Esplora API)

Core Concepts
- feeRate (sat/vB): Final fee = tx.virtualSize() × feeRate.
- Two-pass build: Measure exact vsize, compute exact fee, rebuild with precise change, then broadcast.
- RBF enabled: Inputs use sequence 0xfffffffd.
- Dust threshold: Change outputs are added only if > 546 sats.

Main Functions (src/index.ts)
- createBtcWallet(network): Generates P2WPKH wallet (SegWit).
- getWalletBalance(wif, network, esploraApiUrl): Returns address, balance, UTXOs.
- sendTransaction(wif, receiverAddress, amount, network, esploraApiUrl, feeRate):
  - Selects UTXOs (estimate using ~110 vB/input, ~31 vB/output, +10 overhead).
  - First pass PSBT to measure exact vsize and fee.
  - Second pass PSBT with exact change; signs and broadcasts.
  - Logs: estimated vs exact fee, change, txid.
- fetchAllTransactions(esploraApiUrl, address, options):
  - Fetches mempool and confirmed txs (paginated) for address.
  - Logs each txid and net amount affecting the address.
- computeNetAmountForAddress(tx, address): Sums vout to address minus vin from address.

Esplora Endpoints Used
- GET /address/{address}/utxo
- POST /tx (broadcast hex)
- GET /address/{address}/txs (confirmed, first page)
- GET /address/{address}/txs/chain/{last_seen_txid} (paging)
- GET /address/{address}/txs/mempool (unconfirmed)

Operational Notes
- Exact fee control: Achieved pre-broadcast via two-pass build.
- Change handling: Only added if > 546 sats; else absorbed into fee (implicitly by not creating output).
- Errors: Throws if balance insufficient after exact fee computation.

Typical Fee Rates (guidance)
- Economy: 1–3 sat/vB (slow; enable RBF).
- Normal: 4–15 sat/vB (same day).
- Fast: 16–40+ sat/vB (next blocks).
- Peak: 40–200+ sat/vB.
- Testnet: 1–5 sat/vB usually fine.

Common Commands
- Change remote to ssh alias:
  git remote set-url origin git@github-private:harryle120/btc.git
  ssh -T git@github-private
  git push

Addresses/Examples (testnet)
- Uses dynamically generated P2WPKH addresses; see logs for runtime addresses and txids.

Next Ideas
- Add optional live fee estimator (API) to set feeRate dynamically.
- Add wait-for-confirmation helper using /tx/{txid}/status.

