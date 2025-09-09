Decision Log

2025-09-08

- Adopt two-pass PSBT build to compute exact fees. Rationale: avoid overpaying; maximize change.
- Enable RBF via sequence 0xfffffffd on inputs. Rationale: flexibility to bump fee if mempool changes.
- Do not create change ≤ 546 sats. Rationale: avoid dust; economic efficiency.
- Add transaction history fetch with pagination using Esplora. Rationale: complete address activity view.
- Log per-tx net amount for the address. Rationale: transparency and accounting.
