# Stellar project landscape

Research snapshot: 2026-10-22. This is desk research, not merchant validation. Product overlap and project activity can change; recheck before making public claims or applying to a Drips Wave.

## Ecosystem direction

The Stellar Development Foundation's 2026 strategy emphasizes everyday financial services, asset adoption, institutional payments and settlement, and a trustworthy technology stack. A merchant workflow can fit that direction, but ecosystem alignment is not evidence that a particular merchant problem is underserved. [SDF 2026 strategy](https://stellar.org/foundation/strategy)

Drips describes Stellar Wave as recurring monthly contribution cycles where contributors work on issues in selected repositories. The current Wave page lists 886 repositories and 555 organizations, with Wave 10 scheduled through October 22, 2026. Inclusion and acceptance are separate from product demand; check the live rules and repository approval state before planning a submission. [Stellar Wave](https://www.drips.network/wave/stellar) · [Drips Wave documentation](https://docs.drips.network/wave/)

## Adjacent tools and overlap

| Tool | What its public description says it does | Overlap with Current | Gap this project might test |
| --- | --- | --- | --- |
| Stellar Disbursement Platform (SDP) | Organization dashboard for bulk disbursement management, payment and receiver search/filter/export, and analytics; its frontend is designed to work with the SDP backend. | High for dashboards, payment lists, filters, exports, and operational reporting. | It is a disbursement-management system. A lightweight after-the-fact reconciliation helper could serve merchants who already have an order CSV and do not use SDP, if such users report a need. [Frontend](https://github.com/stellar/stellar-disbursement-platform-frontend) · [Backend](https://github.com/stellar/stellar-disbursement-platform-backend) |
| PayLume | Open-source non-custodial merchant payments platform with payment links, checkout, invoices, subscriptions, refunds, webhooks, and payment records; its roadmap includes payment watching and reconciliation. | Very high for merchant payments and reconciliation. | Its broad payment platform may not fit an operator who already accepts payments and only needs a local reconciliation step. That distinction is unvalidated. [Repository](https://github.com/PayLumeHQ/paylume) |
| StellarExpert | Public explorer and transaction lookup. | High for inspecting an account or locating a transaction. | Matching a merchant's own order rows to ledger records may be a different workflow, but it must prove value beyond explorer search. [Explorer](https://stellar.expert/) · [Payment locator](https://stellar.expert/explorer/property/payment-locator) |
| Stellopay | Merchant/payroll and crypto payment dashboard with transaction summaries and transaction list (as described in its public repo and Drips listing). | High for general payment dashboards. | The proposed smaller tool avoids replacing checkout, payroll, or payment operations. Verify current repo and feature state before claiming a gap. [Repository](https://github.com/Stellopay/stellopay-frontend) |
| Quay / Stellar Checkout | Non-custodial merchant checkout and payment acceptance project, including payment watching and memo matching in its public repository description. | High for checkout and identifying incoming payments. | Could complement an existing checkout by reconciling legacy or externally generated order exports, but the workflow is unvalidated. [Repository](https://github.com/determined-001/Quay) |

## Decision

The existing Current prototype is a generic read-only account ledger with search, filters, pagination, and CSV export. That is not sufficiently differentiated on desk research alone: it overlaps a public explorer and operational payment dashboards.

**Recommended next hypothesis:** a local-first Stellar reconciliation assistant. An operator imports an order or sales CSV, maps expected amount and asset (optionally issuer and date), loads public payment records for a Stellar account, and reviews likely matches, unmatched rows, duplicate candidates, and ambiguous matches. The user exports a reconciliation report. The prototype implements only amount, asset, optional issuer, and date matching; memo/reference lookup is a future possibility to validate, not an implemented feature. The original CSV should stay in the browser; no secret keys or payment signing are needed.

This is a direction to test, not a validated need or a promise of complete accounting. PayLume already lists reconciliation in its roadmap and Quay describes memo matching, so the wedge must be the user's existing CSV workflow and low setup cost—not the generic claim that Stellar lacks reconciliation. Before implementation, define matching rules and honest limitations (partial payments, fees, asset issuer identity, path payments, refunds, and duplicate references).

## Validation questions for the next phase

1. Which merchant/operator role already uses Stellar to receive payments, and which order or sales system produces their CSV?
2. How do they currently connect each order to an on-chain payment (memo, payment link, amount/time, or manual lookup)?
3. What cases cause real errors or time loss, and what output would fit their existing bookkeeping process?
4. Would a browser-only file workflow be acceptable, and which fields must never leave their device?

Do not describe merchants as confirmed users until interviews or observed workflow evidence support that claim.

## References

- [SDF 2026 strategy](https://stellar.org/foundation/strategy)
- [Stellar Wave](https://www.drips.network/wave/stellar)
- [Drips Wave docs](https://docs.drips.network/wave/)
- [Stellar Disbursement Platform frontend](https://github.com/stellar/stellar-disbursement-platform-frontend)
- [Stellar Disbursement Platform backend](https://github.com/stellar/stellar-disbursement-platform-backend)
- [PayLume](https://github.com/PayLumeHQ/paylume)
- [StellarExpert](https://stellar.expert/)
- [StellarExpert payment locator](https://stellar.expert/explorer/property/payment-locator)
- [Stellopay frontend](https://github.com/Stellopay/stellopay-frontend)
- [Quay / Stellar Checkout](https://github.com/determined-001/Quay)
