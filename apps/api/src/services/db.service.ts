import { Prisma, PrismaClient } from '@prisma/client';
import { 
  User, Area, IssueCluster, Issue, IssueMedia, 
  IssueSupport, VerificationEvent, Manifesto, 
  ManifestoPromise, PartyProfile, PartyPromise, 
  DeliveryUpdate, AuditEvent, UserRole, IssueSeverity, IssueStatus, PrivacyLevel, PromiseStatus,
  VolunteerApplication, DeliveryDispute, NotificationPreference, ModerationAction, BackgroundJob, PartyMembership, UserNotification, VerificationAssignment,
  CivicAuthority, ExternalGrievanceCase, ExternalCaseStatus, ExternalCaseAppeal, ExternalCaseDocument,
  PromiseMilestone, CitizenPromiseVerdict, CitizenVerdictValue, PincodeBoundary,
  OutboxEvent, Organization, OrganizationInvitation, OrganizationKind, OrganizationMembership, OrganizationRole,
  ActorScopeGrant, ActorScopeType, Visibility
} from '@tgim/shared';

// Initialize Prisma client conditionally
let prisma: PrismaClient | null = null;
const isPrismaEnabled = !!process.env.DATABASE_URL && process.env.TGIM_IN_MEMORY !== 'true';

if (isPrismaEnabled) {
  prisma = new PrismaClient();
}

// In-Memory Database Fallback Store
class InMemoryDb {
  users: User[] = [];
  areas: Area[] = [];
  clusters: IssueCluster[] = [];
  issues: Issue[] = [];
  media: IssueMedia[] = [];
  supports: IssueSupport[] = [];
  verifications: VerificationEvent[] = [];
  manifestos: Manifesto[] = [];
  promises: ManifestoPromise[] = [];
  partyProfiles: PartyProfile[] = [];
  partyPromises: PartyPromise[] = [];
  deliveryUpdates: DeliveryUpdate[] = [];
  auditEvents: AuditEvent[] = [];
  volunteerApplications: VolunteerApplication[] = [];
  disputes: DeliveryDispute[] = [];
  notificationPreferences: NotificationPreference[] = [];
  moderationActions: ModerationAction[] = [];
  jobs: BackgroundJob[] = [];
  partyMemberships: PartyMembership[] = [];
  notifications: UserNotification[] = [];
  verificationAssignments: VerificationAssignment[] = [];
  authorities: CivicAuthority[] = [];
  externalCases: ExternalGrievanceCase[] = [];
  externalCaseAppeals: ExternalCaseAppeal[] = [];
  externalCaseDocuments: ExternalCaseDocument[] = [];
  promiseMilestones: PromiseMilestone[] = [];
  promiseVerdicts: CitizenPromiseVerdict[] = [];
  pincodeBoundaries: PincodeBoundary[] = [];
  outboxEvents: { id: string; event_type: string; entity_type: string; entity_id: string; schema_version: number; payload?: any; occurred_at: Date; claimed_at: Date | null; dispatched_at: Date | null; acknowledged_at: Date | null; attempt_count: number; next_attempt_at: Date | null; last_safe_error: string | null; provider_message_id: string | null; status: string; created_at: Date }[] = [];
  organizations: Organization[] = [];
  organizationMemberships: OrganizationMembership[] = [];
  organizationInvitations: OrganizationInvitation[] = [];
  reportSharingConsents: { id: string; issue_id: string; authority_id: string; granted_by: string; purpose: string; expires_at?: Date; revoked_at?: Date; created_at: Date }[] = [];
  scopeGrants: ActorScopeGrant[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed default admin and user
    const defaultUser: User = {
      id: 'default-citizen-id',
      display_name: 'Asha Patil',
      role: 'citizen',
      preferred_language: 'en',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const defaultVolunteer: User = {
      id: 'default-volunteer-id',
      display_name: 'Imran Khan',
      role: 'volunteer',
      preferred_language: 'mr',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const defaultPartyLead: User = {
      id: 'default-party-id',
      display_name: 'Meera Deshmukh',
      role: 'party_lead',
      preferred_language: 'en',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const defaultOfficer: User = {
      id: 'default-officer-id',
      display_name: 'Suresh Kumar',
      role: 'department_officer',
      preferred_language: 'hi',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const defaultAdmin: User = {
      id: 'default-admin-id',
      display_name: 'Nisha Rao',
      role: 'platform_admin',
      preferred_language: 'en',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.push(defaultUser, defaultVolunteer, defaultPartyLead, defaultOfficer, defaultAdmin);

    // Seed areas
    const maharashtra: Area = {
      id: 'state-maharashtra-id',
      name: 'Maharashtra',
      type: 'state',
      created_at: new Date(),
    };
    const mumbaiCentral: Area = {
      id: 'constituency-mumbai-south-central-id',
      name: 'Mumbai South Central',
      type: 'constituency',
      parent_id: maharashtra.id,
      created_at: new Date(),
    };
    const ward12: Area = {
      id: 'ward-12-id',
      name: 'Ward 12',
      type: 'ward',
      parent_id: mumbaiCentral.id,
      created_at: new Date(),
    };
    defaultUser.home_area_id = ward12.id;
    defaultVolunteer.home_area_id = ward12.id;
    this.areas.push(maharashtra, mumbaiCentral, ward12);
    for (const [id, name] of [
      ['10000000-0000-4000-8000-000000400049', '400049 Juhu'],
      ['10000000-0000-4000-8000-000000400053', '400053 Andheri West'],
      ['10000000-0000-4000-8000-000000400054', '400054 Santacruz West'],
      ['10000000-0000-4000-8000-000000400058', '400058 Andheri West'],
      ['10000000-0000-4000-8000-000000400064', '400064 Malad West'],
      ['10000000-0000-4000-8000-000000400092', '400092 Borivali West'],
    ]) this.areas.push({ id, name, type: 'pincode', parent_id: ward12.id, created_at: new Date() });

    // Seed pincode boundaries with centroids for Mumbai Suburban District
    const pincodeBoundaryNow = new Date();
    const seedPincodes: { code: string; name: string; lat: number; lng: number; areaId: string }[] = [
      { code: '400049', name: 'Juhu', lat: 19.0889, lng: 72.8322, areaId: '10000000-0000-4000-8000-000000400049' },
      { code: '400053', name: 'Andheri West', lat: 19.1137, lng: 72.8538, areaId: '10000000-0000-4000-8000-000000400053' },
      { code: '400054', name: 'Santacruz West', lat: 19.1335, lng: 72.8375, areaId: '10000000-0000-4000-8000-000000400054' },
      { code: '400058', name: 'Andheri East', lat: 19.1140, lng: 72.8689, areaId: '10000000-0000-4000-8000-000000400058' },
      { code: '400064', name: 'Malad West', lat: 19.1900, lng: 72.8550, areaId: '10000000-0000-4000-8000-000000400064' },
      { code: '400092', name: 'Borivali West', lat: 19.2270, lng: 72.8550, areaId: '10000000-0000-4000-8000-000000400092' },
    ];
    for (const p of seedPincodes) {
      this.pincodeBoundaries.push({
        id: p.areaId,
        pincode_code: p.code,
        name: p.name,
        area_id: p.areaId,
        centroid_latitude: p.lat,
        centroid_longitude: p.lng,
        created_at: pincodeBoundaryNow,
      });
    }

    const authorityNow = new Date();
    this.authorities.push(
      { id: '20000000-0000-4000-8000-000000000001', name: 'Municipal Roads Department', jurisdiction_area_id: ward12.id, category: 'roads', service_code: 'ROADS-POTHOLE', service_name: 'Road and pothole repair', description: 'Road surface, footpath, and pothole service requests.', active: true, created_at: authorityNow, updated_at: authorityNow },
      { id: '20000000-0000-4000-8000-000000000002', name: 'Municipal Hydraulic Department', jurisdiction_area_id: ward12.id, category: 'water', service_code: 'WATER-SUPPLY', service_name: 'Water supply and waterlogging', description: 'Leaks, interrupted supply, and public waterlogging.', active: true, created_at: authorityNow, updated_at: authorityNow },
      { id: '20000000-0000-4000-8000-000000000003', name: 'Municipal Solid Waste Department', jurisdiction_area_id: ward12.id, category: 'garbage', service_code: 'WASTE-COLLECTION', service_name: 'Waste collection', description: 'Missed collection, dumping, and sanitation requests.', active: true, created_at: authorityNow, updated_at: authorityNow },
    );

    // Seed party profiles
    const party1: PartyProfile = {
      id: 'party-profile-1-id',
      name: 'People First Coalition',
      official_logo_url: 'https://r2.tgim.org/logos/pfc.png',
      is_verified: true,
      created_at: new Date(),
    };
    this.partyProfiles.push(party1);
    this.partyMemberships.push({ id: crypto.randomUUID(), user_id: defaultPartyLead.id, party_id: party1.id, title: 'Manifesto lead', is_approved: true, created_at: new Date() });

    // Seed default cluster with valid UUID
    const defaultCluster: IssueCluster = {
      id: 'de1bcf20-1a42-4912-8824-c10df8a8470a',
      area_id: ward12.id,
      category: 'water',
      title: 'Waterlogging Outside Government School',
      summary: 'Every monsoon, the area outside Government School near Shivaji Nagar gets heavily waterlogged. Children and parents struggle to pass through knee-deep water.',
      priority_score: 86,
      status: 'draft',
      visibility: 'public',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.clusters.push(defaultCluster);

    // Seed default issue with valid UUID
    const defaultIssue: Issue = {
      id: 'ae1bcf20-1a42-4912-8824-c10df8a8470a',
      reporter_id: defaultUser.id,
      cluster_id: defaultCluster.id,
      area_id: ward12.id,
      category: 'water',
      description: 'Waterlogging Outside Government School. Knee deep water during rains.',
      severity: 'high',
      privacy: 'public',
      exact_latitude: 19.0760,
      exact_longitude: 72.8777,
      public_latitude: 19.0760,
      public_longitude: 72.8777,
      status: 'clustered',
      visibility: 'public',
      idempotency_key: 'seed-idempotency-key',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.issues.push(defaultIssue);

    const manifesto: Manifesto = { id: '30000000-0000-4000-8000-000000000001', area_id: ward12.id, version: 1, is_published: true, published_at: new Date('2026-04-18'), published_by: defaultPartyLead.id, generation_provider: 'deterministic', generation_model: 'tgim-evidence-template-v1', source_cluster_ids: [defaultCluster.id], created_at: new Date('2026-04-12'), updated_at: new Date('2026-04-18') };
    const sourcePromise: ManifestoPromise = { id: '30000000-0000-4000-8000-000000000002', manifesto_id: manifesto.id, cluster_id: defaultCluster.id, time_horizon: '1-year', title: 'A safer school route before the next monsoon', description: 'Repair the waterlogged school approach, clear stormwater inlets, and publish evidence before the next monsoon.', target_metric: 'Restore a safe, passable 90 metre school approach with verified drainage.', created_at: new Date('2026-04-18'), updated_at: new Date('2026-04-18') };
    const adopted: PartyPromise = { id: '30000000-0000-4000-8000-000000000003', party_id: party1.id, source_promise_id: sourcePromise.id, adopted_title: sourcePromise.title, adopted_description: sourcePromise.description, target_metric: sourcePromise.target_metric!, timeline: new Date('2026-08-31'), status: 'on_track', owner_department: 'Municipal Hydraulic Department', estimated_cost: '₹18–24 lakh departmental estimate', feasibility_notes: 'Drain clearance and surface regrading can be delivered before peak monsoon subject to work-order approval.', created_at: new Date('2026-04-18'), updated_at: new Date('2026-07-12') };
    this.manifestos.push(manifesto); this.promises.push(sourcePromise); this.partyPromises.push(adopted);
    this.scopeGrants.push(
      { id: crypto.randomUUID(), actor_id: defaultPartyLead.id, scope_type: 'party', scope_id: party1.id, capabilities: ['manifesto.generate', 'promise.adopt', 'promise.update', 'manifesto.publish'], issued_by: defaultAdmin.id, starts_at: new Date('2026-01-01'), created_at: new Date('2026-01-01') },
      { id: crypto.randomUUID(), actor_id: defaultOfficer.id, scope_type: 'authority', scope_id: '20000000-0000-4000-8000-000000000002', capabilities: ['delivery.update', 'external_case.link', 'external_case.submit'], issued_by: defaultAdmin.id, starts_at: new Date('2026-01-01'), created_at: new Date('2026-01-01') },
    );
    const milestoneDates = [
      ['Demand verified', 'verified', '2026-04-12', 'https://example.org/evidence/verification'],
      ['Promise adopted', 'completed', '2026-04-18', 'https://example.org/evidence/manifesto'],
      ['Owner assigned', 'completed', '2026-04-22', 'https://example.org/evidence/assignment'],
      ['Work underway', 'in_progress', undefined, 'https://example.org/evidence/site-visit'],
      ['Citizen verified', 'pending', undefined, undefined],
    ] as const;
    milestoneDates.forEach(([title, status, completedAt, evidence], index) => this.promiseMilestones.push({ id: `40000000-0000-4000-8000-00000000000${index + 1}`, party_promise_id: adopted.id, title, sequence: index + 1, status, due_at: index === 4 ? adopted.timeline : undefined, completed_at: completedAt ? new Date(completedAt) : undefined, evidence_url: evidence, created_at: new Date('2026-04-12'), updated_at: new Date('2026-07-12') }));
    this.deliveryUpdates.push({ id: '50000000-0000-4000-8000-000000000001', party_promise_id: adopted.id, updater_id: defaultOfficer.id, status: 'on_track', update_text: 'Stormwater inlet cleaning is complete and surface regrading is underway. Site evidence has been published for citizen review.', evidence_url: 'https://example.org/evidence/site-visit', created_at: new Date('2026-07-12') });
    this.externalCases.push({ id: '60000000-0000-4000-8000-000000000001', issue_id: defaultIssue.id, cluster_id: defaultCluster.id, authority_id: this.authorities[1].id, authority_name: this.authorities[1].name, provider: 'municipal-portal', external_id: 'MCGM/RN/2026/0145678', service_code: 'WATER-SUPPLY', status: 'in_progress', status_notes: 'Drain clearance work order issued.', public_url: 'https://portal.mcgm.gov.in/', submitted_at: new Date('2026-04-11'), last_synced_at: new Date('2026-07-12'), created_at: new Date('2026-04-11'), updated_at: new Date('2026-07-12') });
    this.promiseVerdicts.push({ id: '70000000-0000-4000-8000-000000000001', party_promise_id: adopted.id, user_id: defaultUser.id, verdict: 'partly_delivered', created_at: new Date('2026-07-12'), updated_at: new Date('2026-07-12') });
  }
}

const memoryDb = new InMemoryDb();

export const dbService = {
  isPrismaEnabled: () => isPrismaEnabled,
  getPrisma: () => prisma,

  // --- Users Operations ---
  users: {
    findUnique: async (id: string): Promise<User | null> => {
      if (isPrismaEnabled && prisma) {
        return prisma.user.findUnique({ where: { id } }) as any;
      }
      return memoryDb.users.find(u => u.id === id) || null;
    },
    findByClerkUserId: async (clerkUserId: string): Promise<User | null> => {
      if (isPrismaEnabled && prisma) {
        return prisma.user.findUnique({ where: { clerk_user_id: clerkUserId } }) as any;
      }
      return memoryDb.users.find(u => u.clerk_user_id === clerkUserId) || null;
    },
    findByIdentity: async (issuer: string, subject: string): Promise<User | null> => {
      if (isPrismaEnabled && prisma) {
        return prisma.user.findUnique({
          where: { identity_issuer_identity_subject: { identity_issuer: issuer, identity_subject: subject } },
        }) as any;
      }
      return memoryDb.users.find(user => user.identity_issuer === issuer && user.identity_subject === subject) || null;
    },
    upsertIdentity: async (data: {
      identity_issuer: string;
      identity_subject: string;
      home_area_id?: string;
      email?: string;
      display_name?: string;
    }): Promise<User> => {
      if (isPrismaEnabled && prisma) {
        return prisma.user.upsert({
          where: {
            identity_issuer_identity_subject: {
              identity_issuer: data.identity_issuer,
              identity_subject: data.identity_subject,
            },
          },
          update: { email: data.email, display_name: data.display_name, home_area_id: data.home_area_id },
          create: {
            identity_issuer: data.identity_issuer,
            identity_subject: data.identity_subject,
            home_area_id: data.home_area_id,
            email: data.email,
            display_name: data.display_name,
            role: 'citizen',
            preferred_language: 'en',
          },
        }) as any;
      }
      const existing = memoryDb.users.find(user => user.identity_issuer === data.identity_issuer && user.identity_subject === data.identity_subject);
      if (existing) {
        existing.email = data.email ?? existing.email;
        existing.display_name = data.display_name ?? existing.display_name;
        existing.home_area_id = data.home_area_id ?? existing.home_area_id;
        existing.updated_at = new Date();
        return existing;
      }
      const item: User = {
        id: crypto.randomUUID(),
        identity_issuer: data.identity_issuer,
        identity_subject: data.identity_subject,
        home_area_id: data.home_area_id,
        email: data.email,
        display_name: data.display_name,
        role: 'citizen',
        preferred_language: 'en',
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryDb.users.push(item);
      return item;
    },
    upsertClerkUser: async (data: {
      clerk_user_id: string;
      email?: string;
      display_name?: string;
    }): Promise<User> => {
      if (isPrismaEnabled && prisma) {
        return prisma.user.upsert({
          where: { clerk_user_id: data.clerk_user_id },
          update: {
            email: data.email,
            display_name: data.display_name,
          },
          create: {
            clerk_user_id: data.clerk_user_id,
            email: data.email,
            display_name: data.display_name,
            role: 'citizen',
            preferred_language: 'en',
          },
        }) as any;
      }
      const existing = memoryDb.users.find(u => u.clerk_user_id === data.clerk_user_id);
      if (existing) {
        existing.email = data.email ?? existing.email;
        existing.display_name = data.display_name ?? existing.display_name;
        existing.updated_at = new Date();
        return existing;
      }
      const newUser: User = {
        id: crypto.randomUUID(),
        clerk_user_id: data.clerk_user_id,
        email: data.email,
        display_name: data.display_name,
        role: 'citizen',
        preferred_language: 'en',
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryDb.users.push(newUser);
      return newUser;
    },
    create: async (data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
      if (isPrismaEnabled && prisma) {
        return prisma.user.create({ data: data as any }) as any;
      }
      const newUser: User = {
        id: crypto.randomUUID(),
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryDb.users.push(newUser);
      return newUser;
    },
    updateRole: async (id: string, role: UserRole): Promise<User> => {
      if (isPrismaEnabled && prisma) {
        return prisma.user.update({ where: { id }, data: { role } }) as any;
      }
      const user = memoryDb.users.find(u => u.id === id);
      if (!user) throw new Error('User not found');
      user.role = role;
      user.updated_at = new Date();
      return user;
    },
  },

  // --- Tenant organization operations ---
  // All membership queries are organization-scoped.  These operations are the
  // server-side boundary used by invitation and recipient-data routes; a
  // global application role alone never grants tenant access.
  organizations: {
    create: async (data: { name: string; kind: OrganizationKind }): Promise<Organization> => {
      if (isPrismaEnabled && prisma) return (prisma as any).organization.create({ data: { ...data, active: true } });
      const now = new Date();
      const item: Organization = { id: crypto.randomUUID(), ...data, active: true, created_at: now, updated_at: now };
      memoryDb.organizations.push(item);
      return item;
    },
    findUnique: async (id: string): Promise<Organization | null> => {
      if (isPrismaEnabled && prisma) return (prisma as any).organization.findUnique({ where: { id } });
      return memoryDb.organizations.find(item => item.id === id) ?? null;
    },
    findForUser: async (userId: string): Promise<(Organization & { membership_role: OrganizationRole })[]> => {
      if (isPrismaEnabled && prisma) {
        const memberships = await (prisma as any).organizationMembership.findMany({ where: { user_id: userId }, include: { organization: true }, orderBy: { created_at: 'asc' } });
        return memberships.map((item: any) => ({ ...item.organization, membership_role: item.role }));
      }
      return memoryDb.organizationMemberships
        .filter(item => item.user_id === userId)
        .map(item => {
          const organization = memoryDb.organizations.find(org => org.id === item.organization_id);
          return organization ? { ...organization, membership_role: item.role } : null;
        })
        .filter((item): item is Organization & { membership_role: OrganizationRole } => item !== null);
    },
    findMembership: async (organizationId: string, userId: string): Promise<OrganizationMembership | null> => {
      if (isPrismaEnabled && prisma) return (prisma as any).organizationMembership.findUnique({ where: { organization_id_user_id: { organization_id: organizationId, user_id: userId } } });
      return memoryDb.organizationMemberships.find(item => item.organization_id === organizationId && item.user_id === userId) ?? null;
    },
    addMembership: async (data: { organization_id: string; user_id: string; role: OrganizationRole }): Promise<OrganizationMembership> => {
      if (isPrismaEnabled && prisma) return (prisma as any).organizationMembership.upsert({ where: { organization_id_user_id: { organization_id: data.organization_id, user_id: data.user_id } }, update: { role: data.role }, create: data });
      const existing = memoryDb.organizationMemberships.find(item => item.organization_id === data.organization_id && item.user_id === data.user_id);
      if (existing) { existing.role = data.role; existing.updated_at = new Date(); return existing; }
      const now = new Date(); const item: OrganizationMembership = { id: crypto.randomUUID(), ...data, created_at: now, updated_at: now };
      memoryDb.organizationMemberships.push(item); return item;
    },
    createInvitation: async (data: Omit<OrganizationInvitation, 'id' | 'created_at' | 'accepted_at'>): Promise<OrganizationInvitation> => {
      if (isPrismaEnabled && prisma) return (prisma as any).organizationInvitation.create({ data });
      const item: OrganizationInvitation = { id: crypto.randomUUID(), ...data, created_at: new Date() };
      memoryDb.organizationInvitations.push(item); return item;
    },
    findInvitationByTokenHash: async (tokenHash: string): Promise<OrganizationInvitation | null> => {
      if (isPrismaEnabled && prisma) return (prisma as any).organizationInvitation.findUnique({ where: { token_hash: tokenHash } });
      return memoryDb.organizationInvitations.find(item => item.token_hash === tokenHash) ?? null;
    },
    acceptInvitation: async (id: string): Promise<OrganizationInvitation> => {
      if (isPrismaEnabled && prisma) return (prisma as any).organizationInvitation.update({ where: { id }, data: { accepted_at: new Date() } });
      const item = memoryDb.organizationInvitations.find(value => value.id === id); if (!item) throw new Error('Invitation not found'); item.accepted_at = new Date(); return item;
    },
  },

  scopeGrants: {
    create: async (data: Omit<ActorScopeGrant, 'id' | 'created_at'>): Promise<ActorScopeGrant> => {
      if (isPrismaEnabled && prisma) return (prisma as any).actorScopeGrant.create({ data });
      const item: ActorScopeGrant = { id: crypto.randomUUID(), ...data, created_at: new Date() };
      memoryDb.scopeGrants.push(item); return item;
    },
    findActive: async (actorId: string, scopeType: ActorScopeType, scopeId: string, capability: string): Promise<ActorScopeGrant | null> => {
      const now = new Date();
      if (isPrismaEnabled && prisma) return (prisma as any).actorScopeGrant.findFirst({
        where: { actor_id: actorId, scope_type: scopeType, scope_id: scopeId, capabilities: { has: capability }, starts_at: { lte: now }, revoked_at: null, OR: [{ ends_at: null }, { ends_at: { gt: now } }] },
        orderBy: { created_at: 'desc' },
      });
      return memoryDb.scopeGrants.find(item => item.actor_id === actorId && item.scope_type === scopeType && item.scope_id === scopeId && item.capabilities.includes(capability) && item.starts_at <= now && !item.revoked_at && (!item.ends_at || item.ends_at > now)) ?? null;
    },
    revoke: async (id: string): Promise<ActorScopeGrant> => {
      if (isPrismaEnabled && prisma) return (prisma as any).actorScopeGrant.update({ where: { id }, data: { revoked_at: new Date() } });
      const item = memoryDb.scopeGrants.find(grant => grant.id === id); if (!item) throw new Error('Scope grant not found'); item.revoked_at = new Date(); return item;
    },
    findForActor: async (actorId: string): Promise<ActorScopeGrant[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).actorScopeGrant.findMany({ where: { actor_id: actorId }, orderBy: { created_at: 'desc' } });
      return memoryDb.scopeGrants.filter(item => item.actor_id === actorId);
    },
  },

  reportSharingConsents: {
    grant: async (data: { issue_id: string; authority_id: string; granted_by: string; purpose: string; expires_at?: Date }) => {
      if (isPrismaEnabled && prisma) return (prisma as any).reportSharingConsent.upsert({
        where: { issue_id_authority_id_granted_by_purpose: { issue_id: data.issue_id, authority_id: data.authority_id, granted_by: data.granted_by, purpose: data.purpose } },
        update: { expires_at: data.expires_at, revoked_at: null },
        create: data,
      });
      const existing = memoryDb.reportSharingConsents.find(item => item.issue_id === data.issue_id && item.authority_id === data.authority_id && item.granted_by === data.granted_by && item.purpose === data.purpose);
      if (existing) { existing.expires_at = data.expires_at; existing.revoked_at = undefined; return existing; }
      const item = { id: crypto.randomUUID(), ...data, created_at: new Date() }; memoryDb.reportSharingConsents.push(item); return item;
    },
    findActive: async (issueId: string, authorityId: string, purpose = 'external_case_submission') => {
      const now = new Date();
      if (isPrismaEnabled && prisma) return (prisma as any).reportSharingConsent.findFirst({ where: { issue_id: issueId, authority_id: authorityId, purpose, revoked_at: null, OR: [{ expires_at: null }, { expires_at: { gt: now } }] } });
      return memoryDb.reportSharingConsents.find(item => item.issue_id === issueId && item.authority_id === authorityId && item.purpose === purpose && !item.revoked_at && (!item.expires_at || item.expires_at > now)) ?? null;
    },
  },

  // --- Areas Operations ---
  areas: {
    findMany: async (): Promise<Area[]> => {
      if (isPrismaEnabled && prisma) {
        return prisma.area.findMany() as any;
      }
      return memoryDb.areas;
    },
    findUnique: async (id: string): Promise<Area | null> => {
      if (isPrismaEnabled && prisma) {
        return prisma.area.findUnique({ where: { id } }) as any;
      }
      return memoryDb.areas.find(a => a.id === id) || null;
    },
    search: async (query: string): Promise<Area[]> => {
      if (isPrismaEnabled && prisma) {
        return prisma.area.findMany({
          where: { name: { contains: query, mode: 'insensitive' } }
        }) as any;
      }
      const lower = query.toLowerCase();
      return memoryDb.areas.filter(a => a.name.toLowerCase().includes(lower));
    }
  },

  authorities: {
    create: async (data: Omit<CivicAuthority, 'id' | 'created_at' | 'updated_at'>): Promise<CivicAuthority> => {
      if (isPrismaEnabled && prisma) return (prisma as any).civicAuthority.create({ data });
      const now = new Date(); const authority: CivicAuthority = { id: crypto.randomUUID(), ...data, created_at: now, updated_at: now }; memoryDb.authorities.push(authority); return authority;
    },
    findMany: async (filters: { area_id?: string; category?: string; active?: boolean } = {}): Promise<CivicAuthority[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).civicAuthority.findMany({ where: { jurisdiction_area_id: filters.area_id, category: filters.category, active: filters.active }, orderBy: { name: 'asc' } });
      return memoryDb.authorities.filter(item => (!filters.area_id || item.jurisdiction_area_id === filters.area_id) && (!filters.category || item.category === filters.category) && (filters.active === undefined || item.active === filters.active));
    },
    findUnique: async (id: string): Promise<CivicAuthority | null> => {
      if (isPrismaEnabled && prisma) return (prisma as any).civicAuthority.findUnique({ where: { id } });
      return memoryDb.authorities.find(item => item.id === id) ?? null;
    },
    route: async (areaId: string | undefined, category: string, latitude?: number, longitude?: number): Promise<CivicAuthority[]> => {
      if (isPrismaEnabled && prisma && latitude !== undefined && longitude !== undefined) return prisma.$queryRaw<CivicAuthority[]>(Prisma.sql`
        SELECT ca.* FROM civic_authorities ca
        LEFT JOIN areas a ON a.id = ca.jurisdiction_area_id
        WHERE ca.active = true AND ca.category = ${category}
          AND (ca.jurisdiction_area_id IS NULL OR a.boundary IS NULL OR ST_Covers(a.boundary, ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326)))
        ORDER BY CASE WHEN ca.jurisdiction_area_id IS NULL THEN 1 ELSE 0 END, ca.name
      `);
      const all = await dbService.authorities.findMany({ category, active: true });
      return all.filter(item => !areaId || !item.jurisdiction_area_id || item.jurisdiction_area_id === areaId);
    },
  },

  // --- Pincode Operations ---
  pincodes: {
    findMany: async (): Promise<PincodeBoundary[]> => {
      if (isPrismaEnabled && prisma) {
        return (prisma as any).pincodeBoundary.findMany({ orderBy: { pincode_code: 'asc' } });
      }
      return memoryDb.pincodeBoundaries;
    },
    findByCode: async (code: string): Promise<PincodeBoundary | null> => {
      if (isPrismaEnabled && prisma) {
        return (prisma as any).pincodeBoundary.findUnique({ where: { pincode_code: code } });
      }
      return memoryDb.pincodeBoundaries.find(p => p.pincode_code === code) ?? null;
    },
    resolveByCoordinates: async (latitude: number, longitude: number): Promise<PincodeBoundary | null> => {
      if (isPrismaEnabled && prisma) {
        const result = await prisma.$queryRaw<PincodeBoundary[]>(Prisma.sql`
          SELECT id, pincode_code, name, area_id, centroid_latitude, centroid_longitude, created_at
          FROM pincode_boundaries
          WHERE ST_Within(
            ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326),
            boundary
          )
          LIMIT 1
        `);
        return result[0] ?? null;
      }
      // In-memory: nearest centroid within ~200m tolerance (0.002 degrees ~ 220m)
      let best: PincodeBoundary | null = null;
      let bestDist = Infinity;
      for (const p of memoryDb.pincodeBoundaries) {
        const dLat = latitude - p.centroid_latitude;
        const dLng = longitude - p.centroid_longitude;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < bestDist) { bestDist = dist; best = p; }
      }
      if (best && bestDist <= 0.002) return best;
      return null;
    },
  },

  // --- Outbox Event Operations ---
  outboxEvents: {
    create: async (data: { event_type: string; entity_type: string; entity_id: string; payload?: any }): Promise<OutboxEvent & { id: string }> => {
      const now = new Date();
      if (isPrismaEnabled && prisma) {
        return (prisma as any).outboxEvent.create({
          data: { ...data, status: 'pending', created_at: now },
        });
      }
      const item = {
        id: crypto.randomUUID(),
        event_type: data.event_type,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        payload: data.payload,
        schema_version: 1,
        occurred_at: now,
        claimed_at: null,
        dispatched_at: null,
        acknowledged_at: null,
        attempt_count: 0,
        next_attempt_at: null,
        last_safe_error: null,
        provider_message_id: null,
        status: 'pending',
        created_at: now,
      };
      memoryDb.outboxEvents.push(item);
      return { ...item, event_id: item.id };
    },
    findUnsent: async (): Promise<(OutboxEvent & { id: string; status: string; created_at: Date; dispatched_at: Date | null })[]> => {
      if (isPrismaEnabled && prisma) {
        return (prisma as any).outboxEvent.findMany({
          where: { status: 'pending' },
          orderBy: { created_at: 'asc' },
        });
      }
      return memoryDb.outboxEvents
        .filter(item => item.status === 'pending')
        .map(item => ({ ...item, event_id: item.id }));
    },
    findMany: async (): Promise<(OutboxEvent & { id: string; status: string; created_at: Date; dispatched_at: Date | null })[]> => {
      if (isPrismaEnabled && prisma) {
        const items = await (prisma as any).outboxEvent.findMany({ orderBy: { created_at: 'asc' } });
        return items.map((item: any) => ({ ...item, event_id: item.id }));
      }
      return memoryDb.outboxEvents.map(item => ({ ...item, event_id: item.id }));
    },
    findById: async (id: string): Promise<(OutboxEvent & { id: string; status: string; created_at: Date; dispatched_at: Date | null }) | null> => {
      if (isPrismaEnabled && prisma) {
        const item = await (prisma as any).outboxEvent.findUnique({ where: { id } });
        return item ? { ...item, event_id: item.id } : null;
      }
      const item = memoryDb.outboxEvents.find(event => event.id === id);
      return item ? { ...item, event_id: item.id } : null;
    },
    markDispatched: async (id: string, providerMessageId?: string): Promise<void> => {
      if (isPrismaEnabled && prisma) {
        await (prisma as any).outboxEvent.update({
          where: { id },
          data: { status: 'dispatched', dispatched_at: new Date(), provider_message_id: providerMessageId, attempt_count: { increment: 1 } },
        });
        return;
      }
      const item = memoryDb.outboxEvents.find(e => e.id === id);
      if (item) { item.status = 'dispatched'; item.dispatched_at = new Date(); item.provider_message_id = providerMessageId ?? null; item.attempt_count += 1; }
    },
    markFailed: async (id: string, error: string): Promise<void> => {
      if (isPrismaEnabled && prisma) {
        await (prisma as any).outboxEvent.update({
          where: { id },
          data: { status: 'failed', last_safe_error: error.slice(0, 1000), attempt_count: { increment: 1 } },
        });
        return;
      }
      const item = memoryDb.outboxEvents.find(e => e.id === id);
      if (item) { item.status = 'failed'; item.last_safe_error = error.slice(0, 1000); item.attempt_count += 1; }
    },
    markAcknowledged: async (id: string): Promise<void> => {
      if (isPrismaEnabled && prisma) { await (prisma as any).outboxEvent.update({ where: { id }, data: { status: 'acknowledged', acknowledged_at: new Date(), last_safe_error: null } }); return; }
      const item = memoryDb.outboxEvents.find(event => event.id === id); if (item) { item.status = 'acknowledged'; item.acknowledged_at = new Date(); item.last_safe_error = null; }
    },
  },

  externalCases: {
    create: async (data: Omit<ExternalGrievanceCase, 'id' | 'authority_name' | 'created_at' | 'updated_at'>): Promise<ExternalGrievanceCase> => {
      if (isPrismaEnabled && prisma) {
        const item = await (prisma as any).externalGrievanceCase.create({ data, include: { authority: true } });
        return { ...item, authority_name: item.authority.name };
      }
      const authority = memoryDb.authorities.find(item => item.id === data.authority_id); if (!authority) throw new Error('Authority not found');
      const now = new Date(); const item: ExternalGrievanceCase = { id: crypto.randomUUID(), ...data, authority_name: authority.name, created_at: now, updated_at: now }; memoryDb.externalCases.push(item); return item;
    },
    findByIssue: async (issueId: string): Promise<ExternalGrievanceCase[]> => {
      if (isPrismaEnabled && prisma) return ((await (prisma as any).externalGrievanceCase.findMany({ where: { issue_id: issueId }, include: { authority: true }, orderBy: { submitted_at: 'desc' } })) as any[]).map(item => ({ ...item, authority_name: item.authority.name }));
      return memoryDb.externalCases.filter(item => item.issue_id === issueId);
    },
    findUnique: async (id: string): Promise<ExternalGrievanceCase | null> => {
      if (isPrismaEnabled && prisma) { const item = await (prisma as any).externalGrievanceCase.findUnique({ where: { id }, include: { authority: true } }); return item ? { ...item, authority_name: item.authority.name } : null; }
      return memoryDb.externalCases.find(item => item.id === id) ?? null;
    },
    update: async (id: string, data: { status: ExternalCaseStatus; status_notes?: string; public_url?: string; closed_at?: Date; last_synced_at?: Date }): Promise<ExternalGrievanceCase> => {
      if (isPrismaEnabled && prisma) { const item = await (prisma as any).externalGrievanceCase.update({ where: { id }, data, include: { authority: true } }); return { ...item, authority_name: item.authority.name }; }
      const item = memoryDb.externalCases.find(value => value.id === id); if (!item) throw new Error('External case not found'); Object.assign(item, data, { updated_at: new Date() }); return item;
    },
  },

  externalCaseDocuments: {
    create: async (data: Omit<ExternalCaseDocument, 'id' | 'created_at'>): Promise<ExternalCaseDocument> => {
      if (isPrismaEnabled && prisma) return (prisma as any).externalCaseDocument.create({ data });
      const item: ExternalCaseDocument = { id: crypto.randomUUID(), ...data, created_at: new Date() }; memoryDb.externalCaseDocuments.push(item); return item;
    },
    findByCase: async (caseId: string, publicOnly = false): Promise<ExternalCaseDocument[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).externalCaseDocument.findMany({ where: { external_case_id: caseId, ...(publicOnly ? { is_public: true } : {}) }, orderBy: { created_at: 'desc' } });
      return memoryDb.externalCaseDocuments.filter(item => item.external_case_id === caseId && (!publicOnly || item.is_public));
    },
  },

  externalCaseAppeals: {
    create: async (data: Omit<ExternalCaseAppeal, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<ExternalCaseAppeal> => {
      if (isPrismaEnabled && prisma) return (prisma as any).externalCaseAppeal.create({ data: { ...data, status: 'submitted' } });
      const now = new Date(); const item: ExternalCaseAppeal = { id: crypto.randomUUID(), ...data, status: 'submitted', created_at: now, updated_at: now }; memoryDb.externalCaseAppeals.push(item); return item;
    },
    findByCase: async (caseId: string): Promise<ExternalCaseAppeal[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).externalCaseAppeal.findMany({ where: { external_case_id: caseId }, orderBy: { created_at: 'desc' } });
      return memoryDb.externalCaseAppeals.filter(item => item.external_case_id === caseId);
    },
  },

  // --- Issues Operations ---
  issues: {
    create: async (data: {
      reporter_id?: string;
      category: string;
      description: string;
      severity: IssueSeverity;
      privacy: PrivacyLevel;
      latitude: number;
      longitude: number;
      idempotency_key?: string;
      visibility?: Visibility;
    }): Promise<Issue> => {
      if (isPrismaEnabled && prisma) {
        // Execute raw custom SQL to handle PostGIS geometry insertion if using Prisma
        // Blur coordinates slightly (random jitter within ~200m) for public view
        const jitterLat = data.latitude + (Math.random() - 0.5) * 0.002;
        const jitterLng = data.longitude + (Math.random() - 0.5) * 0.002;
        const result: any = await prisma.$queryRaw(Prisma.sql`
          INSERT INTO issues (
            reporter_id, category, description, severity, privacy, visibility, exact_location, public_location, idempotency_key
          ) VALUES (
            ${data.reporter_id ?? null}::uuid, ${data.category}, ${data.description}, ${data.severity}::"IssueSeverity", ${data.privacy}::"PrivacyLevel", ${data.visibility ?? 'public'},
            ST_SetSRID(ST_Point(${data.longitude}, ${data.latitude}), 4326), ST_SetSRID(ST_Point(${jitterLng}, ${jitterLat}), 4326), ${data.idempotency_key ?? null}
          ) RETURNING id, reporter_id, cluster_id, area_id, category, description, severity, privacy, status, visibility, idempotency_key,
            ST_Y(exact_location::geometry) as exact_latitude, ST_X(exact_location::geometry) as exact_longitude,
            ST_Y(public_location::geometry) as public_latitude, ST_X(public_location::geometry) as public_longitude, created_at, updated_at
        `);
        return result[0];
      }

      // Check idempotency
      if (data.idempotency_key) {
        const existing = memoryDb.issues.find(i => i.idempotency_key === data.idempotency_key);
        if (existing) return existing;
      }

      // A public coordinate is always a privacy projection. `privacy` controls
      // reporter-facing disclosure, never whether the exact submitted point
      // may escape through a public DTO.
      const jitterLat = (Math.random() - 0.5) * 0.002;
      const jitterLng = (Math.random() - 0.5) * 0.002;
      const newIssue: Issue = {
        id: crypto.randomUUID(),
        reporter_id: data.reporter_id,
        category: data.category,
        description: data.description,
        severity: data.severity,
        privacy: data.privacy,
        exact_latitude: data.latitude,
        exact_longitude: data.longitude,
        public_latitude: data.latitude + jitterLat,
        public_longitude: data.longitude + jitterLng,
        status: 'open',
        visibility: data.visibility ?? 'public',
        idempotency_key: data.idempotency_key,
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      // Assign ward-12 as default area for mock consistency
      newIssue.area_id = 'ward-12-id';
      memoryDb.issues.push(newIssue);
      return newIssue;
    },
    findUnique: async (id: string): Promise<Issue | null> => {
      if (isPrismaEnabled && prisma) {
        const issues: any = await prisma.$queryRaw(Prisma.sql`
          SELECT id, reporter_id, cluster_id, area_id, category, description, severity, privacy, status, visibility, idempotency_key,
                 ST_Y(exact_location::geometry) as exact_latitude, ST_X(exact_location::geometry) as exact_longitude,
                 ST_Y(public_location::geometry) as public_latitude, ST_X(public_location::geometry) as public_longitude,
                 created_at, updated_at
          FROM issues WHERE id = ${id}::uuid
        `);
        return issues[0] || null;
      }
      return memoryDb.issues.find(i => i.id === id) || null;
    },
    findMany: async (filters: { area_id?: string; category?: string }): Promise<Issue[]> => {
      if (isPrismaEnabled && prisma) {
        const conditions = [Prisma.sql`TRUE`];
        if (filters.area_id) conditions.push(Prisma.sql`area_id = ${filters.area_id}::uuid`);
        if (filters.category) conditions.push(Prisma.sql`category = ${filters.category}`);
        return prisma.$queryRaw(Prisma.sql`
          SELECT id, reporter_id, cluster_id, area_id, category, description, severity, privacy, status, visibility, idempotency_key,
                 ST_Y(exact_location::geometry) as exact_latitude, ST_X(exact_location::geometry) as exact_longitude,
                 ST_Y(public_location::geometry) as public_latitude, ST_X(public_location::geometry) as public_longitude,
                 created_at, updated_at
          FROM issues WHERE ${Prisma.join(conditions, ' AND ')}
        `) as any;
      }
      return memoryDb.issues.filter(i => {
        if (filters.area_id && i.area_id !== filters.area_id) return false;
        if (filters.category && i.category !== filters.category) return false;
        return true;
      });
    },
    linkToCluster: async (issueId: string, clusterId: string): Promise<void> => {
      if (isPrismaEnabled && prisma) {
        await prisma.issue.update({ where: { id: issueId }, data: { cluster_id: clusterId, status: 'clustered' } });
        return;
      }
      const issue = memoryDb.issues.find(i => i.id === issueId);
      if (issue) {
        issue.cluster_id = clusterId;
        issue.status = 'clustered';
      }
    },
    updateStatus: async (issueId: string, status: IssueStatus): Promise<Issue> => {
      if (isPrismaEnabled && prisma) {
        const result: any = await prisma.$queryRaw(Prisma.sql`
          UPDATE issues SET status = ${status}::"IssueStatus", updated_at = now()
          WHERE id = ${issueId}::uuid
          RETURNING id, reporter_id, cluster_id, area_id, category, description, severity, privacy, status, visibility, idempotency_key,
            ST_Y(exact_location::geometry) as exact_latitude, ST_X(exact_location::geometry) as exact_longitude,
            ST_Y(public_location::geometry) as public_latitude, ST_X(public_location::geometry) as public_longitude, created_at, updated_at
        `);
        if (!result[0]) throw new Error('Issue not found');
        return result[0];
      }
      const issue = memoryDb.issues.find(item => item.id === issueId);
      if (!issue) throw new Error('Issue not found');
      issue.status = status;
      issue.updated_at = new Date();
      return issue;
    },
    updateVisibility: async (issueId: string, visibility: Visibility): Promise<Issue> => {
      if (isPrismaEnabled && prisma) {
        const result: any = await prisma.$queryRaw(Prisma.sql`
          UPDATE issues SET visibility = ${visibility}, updated_at = now() WHERE id = ${issueId}::uuid
          RETURNING id, reporter_id, cluster_id, area_id, category, description, severity, privacy, status, visibility, idempotency_key,
            ST_Y(exact_location::geometry) as exact_latitude, ST_X(exact_location::geometry) as exact_longitude,
            ST_Y(public_location::geometry) as public_latitude, ST_X(public_location::geometry) as public_longitude, created_at, updated_at
        `);
        if (!result[0]) throw new Error('Issue not found');
        return result[0];
      }
      const issue = memoryDb.issues.find(item => item.id === issueId);
      if (!issue) throw new Error('Issue not found');
      issue.visibility = visibility; issue.updated_at = new Date(); return issue;
    },
  },

  // --- Media Operations ---
  media: {
    create: async (data: Omit<IssueMedia, 'id' | 'created_at'>): Promise<IssueMedia> => {
      if (isPrismaEnabled && prisma) {
        return prisma.issueMedia.create({ data: data as any }) as any;
      }
      const newMedia: IssueMedia = {
        id: crypto.randomUUID(),
        ...data,
        created_at: new Date(),
      };
      memoryDb.media.push(newMedia);
      return newMedia;
    },
    findByIssue: async (issueId: string): Promise<IssueMedia[]> => {
      if (isPrismaEnabled && prisma) {
        return prisma.issueMedia.findMany({ where: { issue_id: issueId } }) as any;
      }
      return memoryDb.media.filter(m => m.issue_id === issueId);
    }
  },

  // --- Supports Operations ---
  supports: {
    create: async (userId: string, issueId: string): Promise<IssueSupport> => {
      if (isPrismaEnabled && prisma) {
        return prisma.issueSupport.create({ data: { user_id: userId, issue_id: issueId } }) as any;
      }
      const existing = memoryDb.supports.find(s => s.user_id === userId && s.issue_id === issueId);
      if (existing) return existing;

      const newSupport: IssueSupport = {
        id: crypto.randomUUID(),
        user_id: userId,
        issue_id: issueId,
        created_at: new Date(),
      };
      memoryDb.supports.push(newSupport);
      return newSupport;
    },
    countByIssue: async (issueId: string): Promise<number> => {
      if (isPrismaEnabled && prisma) {
        return prisma.issueSupport.count({ where: { issue_id: issueId } });
      }
      return memoryDb.supports.filter(s => s.issue_id === issueId).length;
    },
    countByCluster: async (clusterId: string): Promise<number> => {
      if (isPrismaEnabled && prisma) {
        const result: any = await prisma.$queryRaw(Prisma.sql`
          SELECT COUNT(s.id) as count 
          FROM issue_supports s
          JOIN issues i ON s.issue_id = i.id
          WHERE i.cluster_id = ${clusterId}::uuid
        `);
        return Number(result[0]?.count || 0);
      }
      const issueIdsInCluster = memoryDb.issues.filter(i => i.cluster_id === clusterId).map(i => i.id);
      return memoryDb.supports.filter(s => issueIdsInCluster.includes(s.issue_id)).length;
    }
  },

  // --- Clusters Operations ---
  clusters: {
    create: async (data: { area_id: string; category: string; title: string; summary?: string }): Promise<IssueCluster> => {
      if (isPrismaEnabled && prisma) {
        return prisma.issueCluster.create({ data }) as any;
      }
      const newCluster: IssueCluster = {
        id: crypto.randomUUID(),
        ...data,
        priority_score: 0,
        status: 'draft',
        visibility: 'public',
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryDb.clusters.push(newCluster);
      return newCluster;
    },
    findMany: async (filters: { area_id?: string; category?: string }): Promise<IssueCluster[]> => {
      if (isPrismaEnabled && prisma) {
        return prisma.issueCluster.findMany({ where: filters }) as any;
      }
      return memoryDb.clusters.filter(c => {
        if (filters.area_id && c.area_id !== filters.area_id) return false;
        if (filters.category && c.category !== filters.category) return false;
        return true;
      });
    },
    findUnique: async (id: string): Promise<IssueCluster | null> => {
      if (isPrismaEnabled && prisma) {
        return prisma.issueCluster.findUnique({ where: { id } }) as any;
      }
      return memoryDb.clusters.find(c => c.id === id) || null;
    },
    updateScore: async (id: string, score: number, status?: 'draft' | 'verified' | 'manifesto_ready' | 'resolved'): Promise<void> => {
      if (isPrismaEnabled && prisma) {
        await prisma.issueCluster.update({
          where: { id },
          data: { priority_score: score, ...(status ? { status } : {}) }
        });
        return;
      }
      const cluster = memoryDb.clusters.find(c => c.id === id);
      if (cluster) {
        cluster.priority_score = score;
        if (status) cluster.status = status;
        cluster.updated_at = new Date();
      }
    }
  },

  // --- Verification Operations ---
  verifications: {
    create: async (data: Omit<VerificationEvent, 'id' | 'created_at'>): Promise<VerificationEvent> => {
      if (isPrismaEnabled && prisma) {
        return prisma.verificationEvent.create({ data: data as any }) as any;
      }
      const newVerification: VerificationEvent = {
        id: crypto.randomUUID(),
        ...data,
        created_at: new Date(),
      };
      memoryDb.verifications.push(newVerification);
      
      // Update cluster status based on verification outcome
      const cluster = memoryDb.clusters.find(c => c.id === data.cluster_id);
      if (cluster) {
        if (data.outcome === 'verified') {
          cluster.status = 'verified';
        } else if (data.outcome === 'rejected') {
          cluster.status = 'resolved'; // lock it
        }
      }

      return newVerification;
    },
    findByCluster: async (clusterId: string): Promise<VerificationEvent[]> => {
      if (isPrismaEnabled && prisma) {
        return prisma.verificationEvent.findMany({ where: { cluster_id: clusterId } }) as any;
      }
      return memoryDb.verifications.filter(v => v.cluster_id === clusterId);
    }
  },

  verificationAssignments: {
    assign: async (data: Pick<VerificationAssignment, 'cluster_id' | 'volunteer_id' | 'safety_notes' | 'due_at'>): Promise<VerificationAssignment> => {
      if (isPrismaEnabled && prisma) return (prisma as any).verificationAssignment.upsert({ where: { cluster_id_volunteer_id: { cluster_id: data.cluster_id, volunteer_id: data.volunteer_id } }, update: { status: 'assigned', safety_notes: data.safety_notes, due_at: data.due_at }, create: data });
      const existing = memoryDb.verificationAssignments.find(item => item.cluster_id === data.cluster_id && item.volunteer_id === data.volunteer_id);
      if (existing) { Object.assign(existing, data, { status: 'assigned', updated_at: new Date() }); return existing; }
      const now = new Date(); const item: VerificationAssignment = { id: crypto.randomUUID(), ...data, status: 'assigned', created_at: now, updated_at: now }; memoryDb.verificationAssignments.push(item); return item;
    },
    findByVolunteer: async (volunteerId: string): Promise<VerificationAssignment[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).verificationAssignment.findMany({ where: { volunteer_id: volunteerId, status: { not: 'cancelled' } }, orderBy: { due_at: 'asc' } });
      return memoryDb.verificationAssignments.filter(item => item.volunteer_id === volunteerId && item.status !== 'cancelled');
    },
    updateStatus: async (id: string, volunteerId: string, status: 'accepted' | 'completed'): Promise<VerificationAssignment> => {
      if (isPrismaEnabled && prisma) return (prisma as any).verificationAssignment.update({ where: { id, volunteer_id: volunteerId }, data: { status } });
      const item = memoryDb.verificationAssignments.find(assignment => assignment.id === id && assignment.volunteer_id === volunteerId); if (!item) throw new Error('Assignment not found'); item.status = status; item.updated_at = new Date(); return item;
    },
  },

  // --- Manifesto Operations ---
  manifestos: {
    createDraft: async (areaId: string): Promise<Manifesto> => {
      if (isPrismaEnabled && prisma) {
        // Find latest version
        const latest = await prisma.manifesto.findFirst({
          where: { area_id: areaId },
          orderBy: { version: 'desc' }
        });
        const nextVersion = latest ? latest.version + 1 : 1;
        return prisma.manifesto.create({
          data: { area_id: areaId, version: nextVersion }
        }) as any;
      }
      const areaManifestos = memoryDb.manifestos.filter(m => m.area_id === areaId);
      const nextVersion = areaManifestos.length + 1;
      const newManifesto: Manifesto = {
        id: crypto.randomUUID(),
        area_id: areaId,
        version: nextVersion,
        is_published: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryDb.manifestos.push(newManifesto);
      return newManifesto;
    },
    findLatest: async (areaId: string): Promise<Manifesto | null> => {
      if (isPrismaEnabled && prisma) {
        return prisma.manifesto.findFirst({
          where: { area_id: areaId },
          orderBy: { version: 'desc' }
        }) as any;
      }
      const areaManifestos = memoryDb.manifestos.filter(m => m.area_id === areaId);
      if (areaManifestos.length === 0) return null;
      return areaManifestos.reduce((prev, current) => (prev.version > current.version) ? prev : current);
    },
    findLatestPublished: async (areaId: string): Promise<Manifesto | null> => {
      if (isPrismaEnabled && prisma) {
        return prisma.manifesto.findFirst({
          where: { area_id: areaId, is_published: true },
          orderBy: { version: 'desc' },
        }) as any;
      }
      const published = memoryDb.manifestos.filter(item => item.area_id === areaId && item.is_published);
      if (published.length === 0) return null;
      return published.reduce((previous, current) => previous.version > current.version ? previous : current);
    },
    findUnique: async (id: string): Promise<Manifesto | null> => {
      if (isPrismaEnabled && prisma) return prisma.manifesto.findUnique({ where: { id } }) as any;
      return memoryDb.manifestos.find(item => item.id === id) ?? null;
    },
    publish: async (id: string, publisherId: string): Promise<Manifesto> => {
      if (isPrismaEnabled && prisma) {
        return (prisma as any).manifesto.update({
          where: { id },
          data: { is_published: true, published_at: new Date(), published_by: publisherId }
        }) as any;
      }
      const manifesto = memoryDb.manifestos.find(m => m.id === id);
      if (!manifesto) throw new Error('Manifesto not found');
      manifesto.is_published = true;
      manifesto.published_at = new Date();
      manifesto.published_by = publisherId;
      manifesto.updated_at = new Date();
      return manifesto;
    },
    setGenerationMetadata: async (id: string, data: { generation_provider: string; generation_model: string; source_cluster_ids: string[] }): Promise<Manifesto> => {
      if (isPrismaEnabled && prisma) return prisma.manifesto.update({ where: { id }, data: data as any }) as any;
      const manifesto = memoryDb.manifestos.find(item => item.id === id);
      if (!manifesto) throw new Error('Manifesto not found');
      Object.assign(manifesto, data, { updated_at: new Date() });
      return manifesto;
    }
  },

  // --- Manifesto Promises Operations ---
  manifestoPromises: {
    create: async (data: Omit<ManifestoPromise, 'id' | 'created_at' | 'updated_at'>): Promise<ManifestoPromise> => {
      if (isPrismaEnabled && prisma) {
        return prisma.manifestoPromise.create({ data: data as any }) as any;
      }
      const newPromise: ManifestoPromise = {
        id: crypto.randomUUID(),
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryDb.promises.push(newPromise);
      return newPromise;
    },
    findByManifesto: async (manifestoId: string): Promise<ManifestoPromise[]> => {
      if (isPrismaEnabled && prisma) {
        return prisma.manifestoPromise.findMany({ where: { manifesto_id: manifestoId } }) as any;
      }
      return memoryDb.promises.filter(p => p.manifesto_id === manifestoId);
    },
    findUnique: async (id: string): Promise<ManifestoPromise | null> => {
      if (isPrismaEnabled && prisma) {
        return prisma.manifestoPromise.findUnique({ where: { id } }) as any;
      }
      return memoryDb.promises.find(p => p.id === id) || null;
    }
  },

  partyProfiles: {
    findMany: async (): Promise<PartyProfile[]> => {
      if (isPrismaEnabled && prisma) return prisma.partyProfile.findMany({ orderBy: { name: 'asc' } }) as any;
      return memoryDb.partyProfiles;
    },
    verify: async (id: string): Promise<PartyProfile> => {
      if (isPrismaEnabled && prisma) return prisma.partyProfile.update({ where: { id }, data: { is_verified: true } }) as any;
      const party = memoryDb.partyProfiles.find(item => item.id === id); if (!party) throw new Error('Party profile not found'); party.is_verified = true; return party;
    },
  },

  partyMemberships: {
    findPartyForUser: async (userId: string): Promise<PartyProfile | null> => {
      if (isPrismaEnabled && prisma) {
        const membership = await (prisma as any).partyMembership.findFirst({ where: { user_id: userId, is_approved: true }, include: { party: true } });
        return membership?.party?.is_verified ? membership.party : null;
      }
      const membership = memoryDb.partyMemberships.find(item => item.user_id === userId && item.is_approved);
      return membership ? memoryDb.partyProfiles.find(item => item.id === membership.party_id && item.is_verified) ?? null : null;
    },
    assign: async (data: Omit<PartyMembership, 'id' | 'is_approved' | 'created_at'>): Promise<PartyMembership> => {
      if (isPrismaEnabled && prisma) return (prisma as any).partyMembership.upsert({ where: { user_id_party_id: { user_id: data.user_id, party_id: data.party_id } }, update: { title: data.title, is_approved: true }, create: { ...data, is_approved: true } });
      const existing = memoryDb.partyMemberships.find(item => item.user_id === data.user_id && item.party_id === data.party_id);
      if (existing) { existing.title = data.title; existing.is_approved = true; return existing; }
      const membership: PartyMembership = { id: crypto.randomUUID(), ...data, is_approved: true, created_at: new Date() }; memoryDb.partyMemberships.push(membership); return membership;
    },
  },

  // --- Party Adopted Promises Operations ---
  partyPromises: {
    adopt: async (data: {
      party_id: string;
      source_promise_id: string;
      adopted_title: string;
      adopted_description: string;
      target_metric: string;
      timeline: Date;
    }): Promise<PartyPromise> => {
      if (isPrismaEnabled && prisma) {
        return prisma.partyPromise.create({
          data: { ...data, status: 'adopted' }
        }) as any;
      }
      const newPartyPromise: PartyPromise = {
        id: crypto.randomUUID(),
        ...data,
        status: 'adopted',
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryDb.partyPromises.push(newPartyPromise);
      return newPartyPromise;
    },
    findMany: async (filters: { party_id?: string; status?: PromiseStatus }): Promise<PartyPromise[]> => {
      if (isPrismaEnabled && prisma) {
        return prisma.partyPromise.findMany({ where: filters as any }) as any;
      }
      return memoryDb.partyPromises.filter(pp => {
        if (filters.party_id && pp.party_id !== filters.party_id) return false;
        if (filters.status && pp.status !== filters.status) return false;
        return true;
      });
    },
    findUnique: async (id: string): Promise<PartyPromise | null> => {
      if (isPrismaEnabled && prisma) {
        return prisma.partyPromise.findUnique({ where: { id } }) as any;
      }
      return memoryDb.partyPromises.find(pp => pp.id === id) || null;
    },
    updateStatus: async (id: string, status: PromiseStatus): Promise<PartyPromise> => {
      if (isPrismaEnabled && prisma) {
        return prisma.partyPromise.update({
          where: { id },
          data: { status } as any
        }) as any;
      }
      const pp = memoryDb.partyPromises.find(p => p.id === id);
      if (!pp) throw new Error('Party promise not found');
      pp.status = status;
      pp.updated_at = new Date();
      return pp;
    },
    update: async (id: string, data: Partial<Pick<PartyPromise, 'adopted_title' | 'adopted_description' | 'target_metric' | 'timeline' | 'status' | 'owner_department' | 'estimated_cost' | 'feasibility_notes'>>): Promise<PartyPromise> => {
      if (isPrismaEnabled && prisma) return prisma.partyPromise.update({ where: { id }, data: data as any }) as any;
      const promise = memoryDb.partyPromises.find(item => item.id === id); if (!promise) throw new Error('Party promise not found'); Object.assign(promise, data, { updated_at: new Date() }); return promise;
    }
  },

  promiseMilestones: {
    create: async (data: Omit<PromiseMilestone, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<PromiseMilestone> => {
      if (isPrismaEnabled && prisma) return (prisma as any).promiseMilestone.create({ data: { ...data, status: 'pending' } });
      const now = new Date(); const item: PromiseMilestone = { id: crypto.randomUUID(), ...data, status: 'pending', created_at: now, updated_at: now }; memoryDb.promiseMilestones.push(item); return item;
    },
    findByPromise: async (promiseId: string): Promise<PromiseMilestone[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).promiseMilestone.findMany({ where: { party_promise_id: promiseId }, orderBy: { sequence: 'asc' } });
      return memoryDb.promiseMilestones.filter(item => item.party_promise_id === promiseId).sort((a, b) => a.sequence - b.sequence);
    },
    findUnique: async (id: string): Promise<PromiseMilestone | null> => {
      if (isPrismaEnabled && prisma) return (prisma as any).promiseMilestone.findUnique({ where: { id } });
      return memoryDb.promiseMilestones.find(item => item.id === id) ?? null;
    },
    update: async (id: string, data: Partial<Pick<PromiseMilestone, 'status' | 'completed_at' | 'evidence_url' | 'description'>>): Promise<PromiseMilestone> => {
      if (isPrismaEnabled && prisma) return (prisma as any).promiseMilestone.update({ where: { id }, data });
      const item = memoryDb.promiseMilestones.find(value => value.id === id); if (!item) throw new Error('Milestone not found'); Object.assign(item, data, { updated_at: new Date() }); return item;
    },
  },

  promiseVerdicts: {
    upsert: async (partyPromiseId: string, userId: string, verdict: CitizenVerdictValue, evidenceUrl?: string): Promise<CitizenPromiseVerdict> => {
      if (isPrismaEnabled && prisma) return (prisma as any).citizenPromiseVerdict.upsert({ where: { party_promise_id_user_id: { party_promise_id: partyPromiseId, user_id: userId } }, update: { verdict, evidence_url: evidenceUrl }, create: { party_promise_id: partyPromiseId, user_id: userId, verdict, evidence_url: evidenceUrl } });
      const existing = memoryDb.promiseVerdicts.find(item => item.party_promise_id === partyPromiseId && item.user_id === userId); if (existing) { existing.verdict = verdict; existing.evidence_url = evidenceUrl; existing.updated_at = new Date(); return existing; }
      const now = new Date(); const item: CitizenPromiseVerdict = { id: crypto.randomUUID(), party_promise_id: partyPromiseId, user_id: userId, verdict, evidence_url: evidenceUrl, created_at: now, updated_at: now }; memoryDb.promiseVerdicts.push(item); return item;
    },
    findByPromise: async (promiseId: string): Promise<CitizenPromiseVerdict[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).citizenPromiseVerdict.findMany({ where: { party_promise_id: promiseId } });
      return memoryDb.promiseVerdicts.filter(item => item.party_promise_id === promiseId);
    },
  },

  // --- Delivery Updates Operations ---
  deliveryUpdates: {
    create: async (data: Omit<DeliveryUpdate, 'id' | 'created_at'>): Promise<DeliveryUpdate> => {
      if (isPrismaEnabled && prisma) {
        return prisma.deliveryUpdate.create({ data: data as any }) as any;
      }
      const newUpdate: DeliveryUpdate = {
        id: crypto.randomUUID(),
        ...data,
        created_at: new Date(),
      };
      memoryDb.deliveryUpdates.push(newUpdate);

      // Sync the promise status with the update status
      const pp = memoryDb.partyPromises.find(p => p.id === data.party_promise_id);
      if (pp) {
        pp.status = data.status;
      }

      return newUpdate;
    },
    findByPromise: async (partyPromiseId: string): Promise<DeliveryUpdate[]> => {
      if (isPrismaEnabled && prisma) {
        return prisma.deliveryUpdate.findMany({
          where: { party_promise_id: partyPromiseId },
          orderBy: { created_at: 'desc' }
        }) as any;
      }
      return memoryDb.deliveryUpdates
        .filter(du => du.party_promise_id === partyPromiseId)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }
  },

  // --- Audit Logging Operations ---
  audit: {
    log: async (data: { actor_id?: string; event_type: string; target_table: string; target_id: string; payload?: any }): Promise<AuditEvent> => {
      if (isPrismaEnabled && prisma) {
        return prisma.auditEvent.create({ data }) as any;
      }
      const newAudit: AuditEvent = {
        id: crypto.randomUUID(),
        ...data,
        created_at: new Date(),
      };
      memoryDb.auditEvents.push(newAudit);
      return newAudit;
    },
    findMany: async (): Promise<AuditEvent[]> => {
      if (isPrismaEnabled && prisma) {
        return prisma.auditEvent.findMany({ orderBy: { created_at: 'desc' } }) as any;
      }
      return memoryDb.auditEvents.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }
  },

  volunteerApplications: {
    create: async (data: Pick<VolunteerApplication, 'user_id' | 'motivation' | 'languages'>): Promise<VolunteerApplication> => {
      if (isPrismaEnabled && prisma) return prisma.volunteerApplication.create({ data }) as any;
      const existing = memoryDb.volunteerApplications.find(item => item.user_id === data.user_id && item.status === 'pending');
      if (existing) return existing;
      const now = new Date();
      const item: VolunteerApplication = { id: crypto.randomUUID(), ...data, status: 'pending', created_at: now, updated_at: now };
      memoryDb.volunteerApplications.unshift(item);
      return item;
    },
    findMany: async (): Promise<VolunteerApplication[]> => {
      if (isPrismaEnabled && prisma) return prisma.volunteerApplication.findMany({ orderBy: { created_at: 'desc' } }) as any;
      return memoryDb.volunteerApplications;
    },
    review: async (id: string, reviewerId: string, status: 'approved' | 'rejected', reviewNotes?: string): Promise<VolunteerApplication> => {
      if (isPrismaEnabled && prisma) {
        return prisma.$transaction(async tx => {
          const application = await tx.volunteerApplication.update({ where: { id }, data: { status, reviewed_by: reviewerId, review_notes: reviewNotes } });
          if (status === 'approved') await tx.user.update({ where: { id: application.user_id }, data: { role: 'volunteer' } });
          return application;
        }) as any;
      }
      const item = memoryDb.volunteerApplications.find(entry => entry.id === id);
      if (!item) throw new Error('Volunteer application not found');
      Object.assign(item, { status, reviewed_by: reviewerId, review_notes: reviewNotes, updated_at: new Date() });
      if (status === 'approved') await dbService.users.updateRole(item.user_id, 'volunteer');
      return item;
    },
  },

  disputes: {
    create: async (data: Omit<DeliveryDispute, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<DeliveryDispute> => {
      if (isPrismaEnabled && prisma) return prisma.deliveryDispute.create({ data: { ...data, status: 'open' } }) as any;
      const now = new Date();
      const item: DeliveryDispute = { id: crypto.randomUUID(), ...data, status: 'open', created_at: now, updated_at: now };
      memoryDb.disputes.unshift(item);
      return item;
    },
    findMany: async (promiseId?: string): Promise<DeliveryDispute[]> => {
      if (isPrismaEnabled && prisma) return prisma.deliveryDispute.findMany({ where: promiseId ? { party_promise_id: promiseId } : {}, orderBy: { created_at: 'desc' } }) as any;
      return promiseId ? memoryDb.disputes.filter(item => item.party_promise_id === promiseId) : memoryDb.disputes;
    },
    findPublicByPromise: async (promiseId: string): Promise<DeliveryDispute[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).deliveryDispute.findMany({ where: { party_promise_id: promiseId, is_public: true, published_at: { not: null } }, orderBy: { published_at: 'desc' } }) as any;
      return memoryDb.disputes.filter(item => item.party_promise_id === promiseId && item.is_public && item.published_at);
    },
    resolve: async (id: string, resolverId: string, status: 'needs_information' | 'upheld' | 'rejected', notes: string, publication?: { is_public: boolean; public_rationale?: string }): Promise<DeliveryDispute> => {
      const update = { status, resolved_by: resolverId, resolution_notes: notes, is_public: publication?.is_public ?? false, public_rationale: publication?.public_rationale, published_at: publication?.is_public ? new Date() : null };
      if (isPrismaEnabled && prisma) return (prisma as any).deliveryDispute.update({ where: { id }, data: update }) as any;
      const item = memoryDb.disputes.find(entry => entry.id === id);
      if (!item) throw new Error('Dispute not found');
      Object.assign(item, { ...update, updated_at: new Date() });
      return item;
    },
  },

  notificationPreferences: {
    get: async (userId: string): Promise<NotificationPreference | null> => {
      if (isPrismaEnabled && prisma) return prisma.notificationPreference.findUnique({ where: { user_id: userId } }) as any;
      return memoryDb.notificationPreferences.find(item => item.user_id === userId) ?? null;
    },
    upsert: async (data: NotificationPreference): Promise<NotificationPreference> => {
      if (isPrismaEnabled && prisma) return prisma.notificationPreference.upsert({ where: { user_id: data.user_id }, create: data as any, update: data as any }) as any;
      const index = memoryDb.notificationPreferences.findIndex(item => item.user_id === data.user_id);
      if (index >= 0) memoryDb.notificationPreferences[index] = data;
      else memoryDb.notificationPreferences.push(data);
      return data;
    },
    findPromiseSubscribers: async (): Promise<NotificationPreference[]> => {
      if (isPrismaEnabled && prisma) return prisma.notificationPreference.findMany({ where: { promise_updates: true } }) as any;
      return memoryDb.notificationPreferences.filter(item => item.promise_updates);
    },
  },

  notifications: {
    create: async (data: Omit<UserNotification, 'id' | 'read_at' | 'created_at'>): Promise<UserNotification> => {
      if (isPrismaEnabled && prisma) return (prisma as any).userNotification.create({ data });
      const item: UserNotification = { id: crypto.randomUUID(), ...data, created_at: new Date() }; memoryDb.notifications.unshift(item); return item;
    },
    findByUser: async (userId: string): Promise<UserNotification[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).userNotification.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, take: 100 });
      return memoryDb.notifications.filter(item => item.user_id === userId);
    },
    markRead: async (id: string, userId: string): Promise<UserNotification> => {
      if (isPrismaEnabled && prisma) return (prisma as any).userNotification.update({ where: { id, user_id: userId }, data: { read_at: new Date() } });
      const item = memoryDb.notifications.find(notification => notification.id === id && notification.user_id === userId); if (!item) throw new Error('Notification not found'); item.read_at = new Date(); return item;
    },
  },

  moderation: {
    create: async (data: Omit<ModerationAction, 'id' | 'created_at'>): Promise<ModerationAction> => {
      if (isPrismaEnabled && prisma) return prisma.moderationAction.create({ data }) as any;
      const item: ModerationAction = { id: crypto.randomUUID(), ...data, created_at: new Date() };
      memoryDb.moderationActions.unshift(item);
      return item;
    },
    findMany: async (): Promise<ModerationAction[]> => {
      if (isPrismaEnabled && prisma) return prisma.moderationAction.findMany({ orderBy: { created_at: 'desc' } }) as any;
      return memoryDb.moderationActions;
    },
  },

  jobs: {
    enqueue: async (type: string, payload: Record<string, unknown>, runAfter = new Date()): Promise<BackgroundJob> => {
      if (isPrismaEnabled && prisma) return (prisma as any).backgroundJob.create({ data: { type, payload, run_after: runAfter } });
      const now = new Date();
      const job: BackgroundJob = { id: crypto.randomUUID(), type, payload, status: 'pending', attempts: 0, max_attempts: 5, run_after: runAfter, created_at: now, updated_at: now };
      memoryDb.jobs.push(job);
      return job;
    },
    claim: async (): Promise<BackgroundJob | null> => {
      if (isPrismaEnabled && prisma) {
        const rows = await prisma.$queryRaw<any[]>(Prisma.sql`UPDATE background_jobs SET status = 'running', locked_at = now(), attempts = attempts + 1, updated_at = now() WHERE id = (SELECT id FROM background_jobs WHERE status IN ('pending','failed') AND run_after <= now() AND attempts < max_attempts ORDER BY run_after ASC FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`);
        return (rows[0] as BackgroundJob | undefined) ?? null;
      }
      const job = memoryDb.jobs.find(item => (item.status === 'pending' || item.status === 'failed') && item.run_after <= new Date() && item.attempts < item.max_attempts);
      if (!job) return null;
      Object.assign(job, { status: 'running', locked_at: new Date(), attempts: job.attempts + 1, updated_at: new Date() });
      return job;
    },
    complete: async (id: string): Promise<void> => {
      if (isPrismaEnabled && prisma) { await (prisma as any).backgroundJob.update({ where: { id }, data: { status: 'completed', locked_at: null } }); return; }
      const job = memoryDb.jobs.find(item => item.id === id); if (job) Object.assign(job, { status: 'completed', locked_at: undefined, updated_at: new Date() });
    },
    fail: async (id: string, error: string): Promise<void> => {
      if (isPrismaEnabled && prisma) {
        const job = await (prisma as any).backgroundJob.findUnique({ where: { id } });
        if (job) await (prisma as any).backgroundJob.update({ where: { id }, data: { status: job.attempts >= job.max_attempts ? 'dead_letter' : 'failed', last_error: error, locked_at: null, run_after: new Date(Date.now() + Math.min(60_000, 1000 * 2 ** job.attempts)) } });
        return;
      }
      const job = memoryDb.jobs.find(item => item.id === id);
      if (job) Object.assign(job, { status: job.attempts >= job.max_attempts ? 'dead_letter' : 'failed', last_error: error, locked_at: undefined, run_after: new Date(Date.now() + Math.min(60_000, 1000 * 2 ** job.attempts)), updated_at: new Date() });
    },
    findMany: async (): Promise<BackgroundJob[]> => {
      if (isPrismaEnabled && prisma) return (prisma as any).backgroundJob.findMany({ orderBy: { created_at: 'desc' }, take: 100 });
      return [...memoryDb.jobs].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    },
  }
};
