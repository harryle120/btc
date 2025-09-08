Project Brief

Purpose
- Lightweight BTC wallet utilities for testnet using Esplora API and bitcoinjs-lib.

Scope
- Create P2WPKH wallets, query balances/UTXOs, build/send transactions with precise fee control, and fetch transaction history.

Key Features
- Two-pass PSBT build for exact fee (vsize × feeRate) with RBF enabled.
- Change output handling with dust threshold (> 546 sats).
- Fetch all transactions (mempool + confirmed) with pagination.

Non-Goals (now)
- Seed phrase management, descriptor wallets, multisig, Taproot.
- GUI; this is a programmatic/CLI-oriented library.

Stakeholders
- Owner: harryle120
- Contributors: local devs

Success Criteria
- Accurate fee accounting; transactions confirm according to chosen feeRate.
- Clear logs for fee estimate vs exact and transaction history.

