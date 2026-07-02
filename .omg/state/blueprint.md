# TGIM Pincode-First React Native System Blueprint

## Stage
- blueprint

## Product Frame (Mumbai Suburban Pincode Focus)
- **Target users:** 
  - Citizens of Mumbai Suburban District (reporting issues easily using their 6-digit Pincode).
  - Volunteers (verifying clusters grouped by Pincode sectors).
  - Candidates & Party Leads (curating Pincode-specific manifestos, adopting local promises).
  - Public Administrators (tracking delivery progress by zip code jurisdictions).
- **Core job:** Organize local civic intelligence and manifestos around postal PINCODES (e.g. 400053 for Andheri West, 400064 for Malad) to make onboarding, discovery, and campaigns immediately localized and easily expandable.
- **Success signal:** A citizen report is resolved to Pincode 400053, merged into a 400053 road-repair cluster, adopted by a candidate in the 400053 Party Studio, and tracked to completion.
- **Non-goals:** Multi-district state-wide political structures for v1; the initial rollout is locked to the Mumbai Suburban District's pincodes.

## Technology Stack Lockdown (Mobile MVP)
- **Framework:** React Native with Expo (SDK 51+) and TypeScript.
- **Styling (shadcn/ui equivalent):** **NativeWind (Tailwind CSS for React Native)** + **`@rn-primitives` / `@rnr/reusables` (React Native Reusables)**. This provides copy-paste, customizable radix-like primitives styled with Tailwind, delivering a true shadcn interface experience on iOS and Android.
- **Maps:** MapLibre React Native utilizing vector tile layers for Mumbai pincode polygons.
- **Backend API:** Fastify + Prisma + Neon Postgres (PostGIS + pgvector).
- **Location Resolution:** Reverse geocoding of lat/lng coordinates to 6-digit postal pincodes.

## Pincode-First Database Schema Updates (SQL)
```sql
-- Update areas table types
ALTER TYPE area_type ADD VALUE IF NOT EXISTS 'pincode';

-- Pincodes table to store Mumbai Suburban postal zones
CREATE TABLE pincodes (
    code VARCHAR(6) PRIMARY KEY, -- e.g. '400053'
    name VARCHAR(100) NOT NULL,  -- e.g. 'Andheri West'
    district_id UUID REFERENCES areas(id),
    boundary GEOMETRY(Polygon, 4326), -- PostGIS boundary geometry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX pincodes_boundary_idx ON pincodes USING GIST (boundary);

-- Link issues directly to pincodes
ALTER TABLE issues ADD COLUMN pincode_code VARCHAR(6) REFERENCES pincodes(code);
CREATE INDEX issues_pincode_idx ON issues (pincode_code);

-- Link clusters and manifestos to pincodes
ALTER TABLE issue_clusters ADD COLUMN pincode_code VARCHAR(6) REFERENCES pincodes(code);
ALTER TABLE manifestos ADD COLUMN pincode_code VARCHAR(6) REFERENCES pincodes(code);
```

## Workflow Map (Pincode Centric)
| Flow | Entry | Steps | Exit / Success | Failure / Recovery |
| --- | --- | --- | --- | --- |
| **Citizen Pin Problem** | Tap `+ Pin a Problem` | Pin location $\rightarrow$ API does PostGIS boundary lookup to auto-detect Pincode $\rightarrow$ user confirms or selects manually | Issue created, linked to Pincode code (e.g. `400053`) | If geocoding fails, prompt user with manual 6-digit input dropdown |
| **Pincode Clustering** | Triggered on new issue | Worker checks for similar issues within `D = 200m` inside the *same* Pincode | Issue links to the correct Pincode cluster | Low similarity forms a new cluster for that Pincode |
| **Pincode Manifesto** | Trigger `Generate Manifesto` | Select top verified clusters for the specified Pincode code | Pincode Manifesto draft generated (e.g. "400053 People's Manifesto") | Fallback to District level if Pincode reports are under threshold |
| **Party Studio Review** | Open Party Studio | Filter citizen clusters and manifesto drafts by Pincode dropdown | Adopt Pincode promises and publish official Pincode manifesto | Rejections log reasons linked to Pincode ID |

## Interface Decisions (React Native Reusables / shadcn-rn)
| Surface | Component Decision | Rationale | State Coverage | Owner | Evidence |
| --- | --- | --- | --- | --- | --- |
| **Role Selector** | `Card` / `RadioGroup` from `@rnr/reusables` | Classic shadcn card styling for onboarding selection | active/inactive states, dark theme | Mobile Lead | Render match with mockups |
| **Pin Problem Form** | `Input` / `Select` / `Button` from `@rnr/reusables` | Clean form validation with Zod and NativeWind | validation error, disabled submit | Mobile Lead | Form inputs pass tests |
| **Pincode Dashboard** | `Tabs` / `Accordion` from `@rnr/reusables` | Collapsible Pincode manifesto categories (100-Day, 1-Year) | loading, empty cluster states | Mobile Lead | Tabs trigger state changes |
| **Delivery Tracker** | `Progress` / `Card` from `@rnr/reusables` | Visual progress bars mapping status changes | completed, delayed, disputed indicators | Mobile Lead | Progress bar widths match |

## Mumbai Suburban Seed Pincodes
Initial rollout will seed the following primary pincodes:
- **400049:** Juhu
- **400053:** Andheri West
- **400054:** Santacruz West
- **400058:** Andheri East
- **400064:** Malad West
- **400092:** Borivali West

## Open Questions
- **Boundary Overlaps:** What happens if GPS jitter places an issue slightly outside the official PostGIS postal boundary? (Resolution: Geocoding lookup takes precedence, with citizen confirmation during step 1 of submission).
- **Manifesto Reach:** Can candidates publish a manifesto covering *multiple* contiguous pincodes? (Resolution: Yes, Party Studio allows selecting "All Pincodes in constituency" or specific individual codes).

## Handoff
- **Recommended next command:** Propose initializing the React Native Expo workspace with NativeWind and `@rnr/reusables` (T1.1).
- **Taskboard sync:** Synchronize the taskboard to focus on React Native compilation and pincode APIs.
