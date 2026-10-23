# Contributing

Thanks for taking a look at Current. It is an early local-first Stellar reconciliation prototype. The merchant workflow remains an unvalidated hypothesis.

## Before changing behavior

1. Check the open issues and describe the user-facing problem your change solves.
2. Keep changes scoped. Do not add wallet signing, a backend, storage, or a contract without a matching product requirement and an architecture discussion.
3. For Stellar behavior, check the current official Horizon documentation and use real response fields rather than assumptions.

## Development

Current is dependency-free. Start the local server with `python3 -m http.server 4173` and open `http://localhost:4173`.

Keep public-account data read-only. Never add secret keys, seeds, or credentials to the UI, source, logs, or issue descriptions. Imported CSVs must stay in browser memory unless the project owner explicitly approves a separately reviewed data flow. Escape ledger-provided text before rendering it as HTML and neutralize spreadsheet formulas in exports. Preserve asset issuer identity and make network selection visible.

## Pull requests

- Explain the behavior change and the merchant problem it addresses.
- Include screenshots for user-facing changes when practical.
- Describe checks you ran and any remaining limitations.
- Avoid unrelated formatting changes.

The repository license and final contribution workflow are still to be selected by the project owner.
