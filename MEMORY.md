# TGIM Project Memory

## Project Overview
TGIM (Thank God It's Monday) is a citizen civic reporting, volunteer verification, issue clustering, and political manifesto tracking application. It bridges local citizen complaints directly into candidate promises and verified delivery tracking.

## Geographic Target (Mumbai Suburban District)
- Target District: **Mumbai Suburban District, Maharashtra**
- Organization Unit: **6-Digit Pincodes (PIN Codes)**
- Seeding targets: Andheri West (400053), Malad West (400064), Juhu (400049), Santacruz West (400054), Andheri East (400058), Borivali West (400092).

## Technology Stack
- **Mobile Client:** React Native (Expo) + NativeWind (Tailwind) + `@rnr/reusables` (shadcn-rn components) + MapLibre.
- **Backend API:** Fastify + Prisma + Neon Postgres (PostGIS + pgvector).

## Repository Index
- **Detailed Product Plans:** [docs/PRODUCT_PLANS.md](file:///home/xzcute/Code/tgim/docs/PRODUCT_PLANS.md)
- **Original Product Spec:** [docs/superpowers/specs/2026-05-21-tgim-v1-product-architecture-spec.md](file:///home/robfk/xzcute/tgim/docs/superpowers/specs/2026-05-21-tgim-v1-product-architecture-spec.md)
- **Expert Audit & Lockdown Blueprint:** [expert_audit_report.md](file:///home/robfk/.gemini/antigravity-cli/brain/60b3c74d-5843-4fc5-8867-a20d5e11c541/expert_audit_report.md)
- **Active System Blueprint:** [.omg/state/blueprint.md](file:///home/robfk/xzcute/tgim/.omg/state/blueprint.md)
- **Active Taskboard:** [.omg/state/taskboard.md](file:///home/robfk/xzcute/tgim/.omg/state/taskboard.md)

## Current Status
- **Current Stage:** React Native shadcn-rn Pincode Expansion Planning
- **Active Goal:** Scaffold mobile workspace & setup Pincode APIs (T2.1 / T2.3)

## Core Guardrails & Rules
1. **Zero-Leaking Privacy Policy:** Never leak exact latitude/longitude or user identity fields in public APIs. Map coordinates must resolve to zip code / blurred sectors.
2. **Double-Entry State Auditing:** Every mutation modifying the state of an issue, cluster, promise, or delivery progress must write an entry to `audit_events`.
3. **No Placeholders Policy:** No dummy functions or `TODO` annotations in committed code.
4. **Validation Pipeline:** Every merge/task closure requires linting and type checks to pass.
