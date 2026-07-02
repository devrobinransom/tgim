# Taskboard

## Board Summary
- **Sprint Scope:** React Native shadcn/ui App (Mumbai Suburban Pincode Focus)
- **Total Tasks:** 9
- **Ready Tasks:** 1 (T2.1)
- **Blocked Tasks:** 8 (T2.2 through T2.9)

## Tasks Ledger

| Task ID | Priority | Status | Owner | Dependency | Worktree | Baseline | Lane Health | Summary | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **T2.1** | p0 | ready | developer | - | root | main | clean | Scaffold React Native Expo app in `apps/mobile/` with TypeScript | Expo configuration files present |
| **T2.2** | p0 | todo | developer | T2.1 | root | main | clean | Install NativeWind (Tailwind CSS) and React Native Reusables (shadcn-rn components) | Tailwind configuration compiles |
| **T2.3** | p0 | todo | developer | - | root | main | clean | Implement Pincode boundary schemas, seeds, and geocoding API in backend | API resolves coordinates to 400053 |
| **T2.4** | p0 | todo | developer | T2.2, T2.3 | root | main | clean | Build Onboarding screens (role & Pincode selectors) using `@rnr/reusables` components | Onboarding screens render on emulator |
| **T2.5** | p0 | todo | developer | T2.2 | root | main | clean | MapLibre map screen displaying Mumbai Suburban Pincode boundaries | Map highlights selected Pincode |
| **T2.6** | p0 | todo | developer | T2.4, T2.5 | root | main | clean | Pin a Problem wizard with automatic coordinate-to-pincode resolution | Submit reports linked to Pincode |
| **T2.7** | p1 | todo | developer | T2.2 | root | main | clean | Pincode Manifesto dashboard with collapsible Radix accordion items | Renders priorities grouped by timeframes |
| **T2.8** | p1 | todo | developer | T2.2 | root | main | clean | Delivery Tracker screen with progress indicators and update cards | Tracker bar reflects promise status |
| **T2.9** | p0 | todo | developer | T2.6, T2.7, T2.8 | root | main | clean | Run end-to-end flow testing from Expo client simulator to Fastify API | API logs audit event for each mutation |

## Operational Instructions
1. Tasks must be executed in order of dependencies.
2. No task should be marked `done` or `verified` without matching the stop condition in `Evidence`.
3. Expo components should leverage `@rn-primitives` for styling consistency.
