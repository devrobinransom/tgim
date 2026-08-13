# Open-source product research for TGIM

**Reviewed:** 1 August 2026. This is a product and architecture study, not a dependency shortlist or a claim that any referenced deployment is secure for TGIM's use case.

## Why these products

TGIM needs a trustworthy chain from a citizen report to an accountable public outcome. Most open-source examples cover only one segment of that chain. This set was chosen because it contains real, maintained products with the relevant operational surfaces.

| Product | What it proves | TGIM study area | Licence at reviewed revision |
| --- | --- | --- | --- |
| [FixMyStreet](https://github.com/mysociety/fixmystreet/tree/58d3a713a0c5fa02ffcd515965fd99eadd4890ee) | Map report to correct authority to public status | reports, routing, subscriptions, Open311 | AGPL-3.0-or-later |
| [Decidim](https://github.com/decidim/decidim/tree/f6fff67608b96d7aeeff15f221490c22258a4255) | Participatory processes with authorization and accountability | participation, verification, publication, administration | AGPL-3.0 |
| [CONSUL Democracy](https://github.com/consuldemocracy/consuldemocracy/tree/7faee6e3972d535e2b786280a2f5e6bf45bd5b9a) | Government-facing participation product | proposals, budgets, polls, moderation, back office | AGPL-3.0 |
| [Ushahidi Platform](https://github.com/ushahidi/platform/tree/78f81b4be6c9aa7cc0a49d6b9d53cf744f45d382) | Multi-channel incident intake and mapped publication | external intake, categorization, map publication | AGPL-3.0-or-later |
| [ODK Central](https://github.com/getodk/central/tree/96f7d5e34c9ffba83c3248939070e0b3521c3103) + [Collect](https://github.com/getodk/collect/tree/ad5eb25a84b729e16fe53c480a0323873f8c3a83) | Reliable field collection with a server and mobile client | offline ownership, sync, attachments, operations | Apache-2.0 |
| [Ever Gauzy](https://github.com/ever-co/ever-gauzy/tree/e4cd0e8263a36906dcfb4ccf15d330a042a78e12) | Configurable multi-organization business operations | permissions, settings, integrations, control plane | AGPL-3.0 |

The source revisions above are fixed commit links. Product code, releases, and operational posture will continue to change after this review.

## Reading order

1. [Civic accountability products](CIVIC_ACCOUNTABILITY_PRODUCTS.md) for reporting, verification, participation, and public-tracker models.
2. [Field and offline products](FIELD_AND_OFFLINE_PRODUCTS.md) before changing mobile queues or describing a report as submitted.
3. [Control-plane products](CONTROL_PLANE_PRODUCTS.md) before adding a generic admin screen or more provider integrations.
4. [TGIM adoption decisions](TGIM_ADOPTION_DECISIONS.md) for the concrete current-state gap assessment and delivery order.

## How to interpret findings

- **Observed** means supported by a linked primary repository source reviewed at the commit above.
- **Adopt** is a TGIM product or architecture recommendation, not a statement that TGIM implements it today.
- **Do not copy** identifies a mismatch in licence, threat model, scale, or product semantics.

## Reuse boundary

Four of the six reference products are AGPL projects. Their code is useful to read and their product ideas are useful to adapt, but incorporating AGPL code into a TGIM network service can create source-disclosure obligations. Treat them as pattern references unless counsel has approved a particular reuse. ODK is Apache-2.0, but that does not make its data model, Android implementation, or field-collection semantics a drop-in fit for TGIM.

TGIM's non-negotiable boundary remains: a public response must not expose a reporter identity or exact submitted coordinates. A mature civic product being public-by-default is not a reason to relax that rule.
