Product Context

Users

- Developers needing programmatic BTC testnet transactions and history.

Use Cases

- Generate a SegWit wallet for testing.
- Check balance and UTXOs for a testnet address.
- Send BTC with precise fee control and RBF.
- Fetch all transactions and log per-tx net deltas.

Constraints

- Testnet reliability varies; Esplora rate limits may apply.
- No persistence of secrets; caller manages WIF lifecycle.

Future Enhancements

- Add taproot (P2TR) support and descriptor-based derivation.
- Integrate live fee estimation API.
- Optional confirmation-wait helpers and webhook notifications.
