System Patterns

Architecture
- Single-process Node.js app; modular functions in `src/index.ts`.
- External API boundary: Blockstream Esplora for UTXO/tx queries and broadcast.

Patterns
- Two-pass transaction assembly: measure exact vsize pre-broadcast, then rebuild with precise change.
- RBF sequencing: inputs use sequence 0xfffffffd to allow fee bumping.
- Dust-avoidance: only emit change output when > 546 sats.
- Idempotent reads: fetching history paginates using last_seen_txid.

Error Handling
- Throw on insufficient funds before and after exact fee calculation.
- Log rich context (fee estimate, exact fee, vsize, change).

Performance
- Minimize API calls by using Esplora endpoints that return full tx details (vin.prevout included).

Security
- Private keys handled in-memory via WIF; no persistence.
- Avoid logging secrets; only log addresses and txids.

