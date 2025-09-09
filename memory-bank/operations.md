Operations

Setup

- Node.js + yarn. Install deps: `yarn`.
- Build: `yarn tsc` (per tsconfig).

Environment

- Default network: testnet
- Default Esplora API: https://blockstream.info/testnet/api

Common Tasks

- Create wallet: call `createBtcWallet('testnet')`.
- Check balance: `getWalletBalance(WIF, 'testnet', ESPLORA)`.
- Send tx (exact fee two-pass): `sendTransaction(WIF, to, amount, 'testnet', ESPLORA, feeRate)`.
- Fetch history: `fetchAllTransactions(ESPLORA, address)`.

Troubleshooting

- Permission denied pushing to Git: set remote to ssh alias `git@github-private:OWNER/REPO.git` and ensure the key is added.
- Low fee stuck tx: use RBF to bump; else CPFP from change output.
- Dust warnings: ensure change > 546 sats or add more input value.
