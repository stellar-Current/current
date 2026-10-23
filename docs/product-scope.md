# Product scope

## Working product hypothesis

Current is exploring a local-first Stellar payment reconciliation assistant. An operator imports their order or sales CSV, selects a public Stellar account, reviews candidate matches against on-chain payment records, resolves unmatched or ambiguous rows, and exports the result.

This is a desk-research recommendation, not validated demand. No merchant interviews or observed workflows have been completed. See [landscape research](landscape-research.md) for adjacent tools and the rationale for narrowing the original generic account-ledger concept.

## User and job hypothesis

**User:** an operator at a small business that already accepts Stellar payments and has an order or sales export.

**Job:** when closing out sales, I want to match order rows to public ledger payments and see which records need review, so I can update my business records without searching transactions one by one.

The specific user role, source CSV, and need remain open questions until validated.

## Proposed flow

1. Choose Stellar Mainnet or Testnet and enter a public account address.
2. Import a CSV locally and map amount and asset, with optional issuer and date columns.
3. Load payment records for a clearly stated ledger range/page window.
4. Review suggested one-to-one matches, unmatched orders, unmatched payments, duplicate candidates, and ambiguous matches.
5. Confirm or correct matches and export a reconciliation CSV.

## Product boundaries

- Read public ledger data only; never request, store, or use a secret key.
- Keep imported CSV contents and match decisions in browser memory unless a separately reviewed product decision changes this boundary.
- Treat suggested matches as suggestions. Explain the fields used and require user review for ambiguous candidates.
- Identify assets by code and issuer; never silently treat same-code assets from different issuers as equal.
- State the loaded ledger range and pages. Do not imply completeness when the app has not fetched the complete range.
- Do not claim accounting, tax, settlement, or fraud guarantees.

## Initial acceptance criteria for this hypothesis

- A user can import a CSV without uploading it to a server and map required columns.
- Malformed rows and unsupported values are identified with actionable feedback.
- Matches are explainable and deterministic; ambiguous or duplicate candidates are not silently auto-confirmed.
- Asset comparisons include issuer identity, and date/amount/reference rules are visible to the user.
- The user can confirm, reject, or manually pair candidate rows and export the reviewed result.
- The UI clearly distinguishes ledger data actually loaded from the full account history.
- Empty, invalid address, unavailable network, rate-limit, and pagination states are understandable.
- Keyboard navigation and narrow screens remain usable.

These criteria need adjustment after a real sample CSV and merchant workflow are understood. Do not build production matching rules from fabricated sample needs.

## Out of scope

Payment creation, wallet connection, signing, checkout, payment links, custody, fiat valuation, tax/accounting advice, automatic accounting integrations, saved cloud workspaces, and guarantees of settlement. Reconsider any item only after a concrete user need and security/data-handling review.

## Product research still needed

- Find a few Stellar merchants/operators willing to describe their actual reconciliation workflow.
- Obtain a synthetic or permissioned representative CSV and learn required columns and edge cases.
- Validate whether manual ledger lookup is painful and what outcome is useful.
- Test whether the local-only workflow is acceptable and understandable.
- Recheck the adjacent product landscape and the current Drips repository application rules before public claims or participation.
