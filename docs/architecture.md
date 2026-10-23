# Architecture

## Current data flow

```text
Browser UI
  ├─ GET /accounts/{public-key} ───────> Selected Stellar Horizon network
  └─ GET /accounts/{public-key}/payments -> Selected Stellar Horizon network
       └─ Recent successful payment-related operations
  └─ CSV import and candidate matching stay in browser memory
```

The app is a static HTML, CSS, and JavaScript site. It has no backend, database, authentication service, indexer, wallet SDK, or contract. The browser directly reads public data from Horizon. Mainnet and Testnet endpoints are configured in `app.js`. The CSV parser and matcher run locally; there is no upload endpoint.

## Data handling

- Account details are loaded from `GET /accounts/{account_id}`.
- Recent payment records are loaded from `GET /accounts/{account_id}/payments?order=desc&limit=20`.
- Further pages use Horizon's returned `next` link.
- The asset identity is code plus issuer. XLM is the native asset and has no issuer.
- The selected account address is held in memory for the current page session; no account profile is persisted.
- The raw activity CSV export is generated locally from currently loaded and filtered records.
- Imported reconciliation rows and decisions are held in page memory only. The reconciliation export is also generated locally.
- Candidate matching compares exact decimal text for amount and case-insensitive asset code. If an issuer column is mapped, issuer must also match. If a date column is mapped and parseable, candidates must fall within 24 hours of the row date.
- Candidate matches are not automatically confirmed. The user chooses and confirms candidates; a report marks unmatched and ambiguous rows.

## Limits and failure handling

Horizon is the public data dependency. The UI handles not-found and rate-limited responses, empty results, and general request errors. It does not cache responses across sessions, stream new ledger activity, or guarantee complete historical accounting. Counts refer only to the loaded pages. The matcher does not inspect transaction memos, support partial payments/refunds, or reconcile records outside the loaded Horizon pages. A date window is a candidate heuristic, not proof of payment identity.

The account payments endpoint represents successful payment-related operations. The records can include operations beyond a basic payment. Keep operation labels and amount-field mapping aligned with the actual Horizon object types. Do not assume every operation has `amount`, `from`, or `to` fields.

## Security boundary

Only public account IDs are accepted. No secret key is requested, stored, or sent. Links to Stellar Expert are opened in a separate tab with `noopener` behavior via `noreferrer`. CSV text fields are quoted and spreadsheet formula prefixes are neutralized.

## Architecture decisions

### No Soroban contract in the current scope

The product reads existing ledger data and does not need new on-chain state or authorization. A contract would add deployment, audit, and maintenance costs without improving this read-only flow.

### No backend or database yet

The current features can run as a static site. A backend or indexer may become justified for webhooks, saved team workspaces, controlled caching, or large-scale reporting. Before adding one, define the exact user need, data retention, privacy, reliability target, and operating cost.

### No wallet connection yet

Reading an account is not wallet authentication. If users later need to select a wallet or sign a payment, add that as a separately scoped flow with an explicit signing prompt and a supported Stellar wallet integration. Never treat a pasted public key as proof of ownership.

## Where to verify API behavior

- [Retrieve an account](https://developers.stellar.org/docs/data/apis/horizon/api-reference/retrieve-an-account)
- [Retrieve an account's payments](https://developers.stellar.org/docs/data/apis/horizon/api-reference/get-payments-by-account-id)
- [Horizon response format](https://developers.stellar.org/docs/data/apis/horizon/api-reference/structure/response-format)
