# Current

Current is a local-first Stellar reconciliation prototype. It compares rows in a merchant's CSV export with public payment records for a Stellar account and lets the user review and export the results. Merchant demand and the proposed workflow remain unvalidated hypotheses.

**Working name:** Current. The project owner has not confirmed the final product name or open-source license yet.

## What it does

- Reads public payment records from Stellar Horizon for an entered account.
- Imports a CSV in the browser and lets the user map amount, asset, and optional issuer/date columns.
- Suggests candidates by exact amount and asset code; an optional date column narrows candidates to a 24-hour window.
- Requires user review/confirmation and exports a reconciliation CSV.
- Keeps the payment activity view, filters, pagination, transaction links, and raw activity export as supporting tools.
- Supports Stellar Mainnet and Testnet.

The target user and merchant workflow are working assumptions that still need validation with real users. See [product scope](docs/product-scope.md) and [architecture](docs/architecture.md).

## Run locally

No package install or build step is required. From this directory run:

```sh
python3 -m http.server 4173
```

Open <http://localhost:4173>, select Mainnet or Testnet, and paste a public Stellar account address beginning with `G`. Load recent activity, choose a CSV, map its amount and asset columns, then review candidates.

## Data and privacy

Current makes read-only browser requests to Stellar Horizon. It does not ask for a secret seed, connect a wallet, sign transactions, or send payments. The public account address is sent to the selected Horizon endpoint. Current has no application backend or account database. Imported CSV contents are processed in browser memory and are not uploaded by the application. Reconciliation output is generated locally.

Payment history is ledger activity, not a bank statement or accounting guarantee. The prototype compares exact amount and asset code, with optional issuer matching and a 24-hour date window. It does not inspect transaction memos, detect partial payments, calculate fees, or guarantee full account history. Review candidates before relying on the export. XLM and issued assets are shown in ledger units; an issued asset is identified by its code and issuer, since asset code alone is not unique.

## Project documents

- [Project playbook](docs/current-stellar-project-playbook.pdf)
- [Product scope](docs/product-scope.md)
- [Architecture](docs/architecture.md)
- [Landscape research](docs/landscape-research.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Current limitations

- Horizon availability and rate limits can affect loading.
- The app loads the latest 20 records first; older activity is loaded on request.
- Payment counts describe loaded payment records, not all historical payments.
- Matching only compares loaded records. It does not read transaction memos or support partial payments and refunds.
- No saved workspaces, alerts, authentication, wallet signing, backend indexer, or Soroban contract exists in this version.
- The final name, open-source license, and any future public deployment are not yet confirmed.
