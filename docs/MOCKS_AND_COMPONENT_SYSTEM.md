# TGIM mocks and component system

This is the implementation contract for the accepted TGIM product mock set. The images are directional references for layout, density, component anatomy, and product rhythm; generated text drift is not copied into the product.

## Mock references

- Public Expo mobile app: `docs/mocks/generated/public-mobile.png`
- Party web portal: `docs/mocks/generated/party-portal.png`
- Volunteer web portal: `docs/mocks/generated/volunteer-portal.png`
- Department officer web portal: `docs/mocks/generated/officer-portal.png`
- Admin web portal: `docs/mocks/generated/admin-portal.png`
- Public share page: `docs/mocks/generated/public-share.png`
- Shared primitive board: `docs/mocks/generated/shared-primitives.png`

## Product copy and data rules

- Normalize all place labels to TGIM Mumbai Suburban and pincode-oriented views.
- Public pages use blurred or aggregate coordinates only.
- Values needed to interpret a chart or map must be visible without hover.
- Operational pages use dense table/list/detail layouts rather than marketing sections.
- Shared primitives own repeated layout, status, chart, map, row, and action patterns.

## Shared primitives

The web implementation composes pages from `PageHeader`, `Panel`, `MetricCard`, `StatusChip`, `CategoryBadge`, `FilterBar`, `DataTable`, `EvidenceRow`, `Timeline`, `MiniBar`, `MapInset`, `EmptyState`, and `ActionBar`.

The mobile implementation should map the same system to native equivalents: `Screen`, `TopBar`, `StatCard`, `IssueCard`, `QueueCard`, `SyncBadge`, `MapPreview`, `Timeline`, and form-step components.

## Verification checklist

- Desktop and mobile viewports render without horizontal overflow.
- Party, volunteer, officer, admin, and public routes share primitive behavior and styling.
- Map/chart components include direct labels, visible values, and text summaries.
- Role-specific actions preserve API demo headers until production Clerk tokens replace them.
- Public surfaces do not expose reporter identity or exact coordinates.
