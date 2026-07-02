import { PrismaClient } from '@prisma/client';
// Initialize Prisma client conditionally
let prisma = null;
const isPrismaEnabled = !!process.env.DATABASE_URL;
if (isPrismaEnabled) {
    prisma = new PrismaClient();
}
// In-Memory Database Fallback Store
class InMemoryDb {
    users = [];
    areas = [];
    clusters = [];
    issues = [];
    media = [];
    supports = [];
    verifications = [];
    manifestos = [];
    promises = [];
    partyProfiles = [];
    partyPromises = [];
    deliveryUpdates = [];
    auditEvents = [];
    constructor() {
        this.seedInitialData();
    }
    seedInitialData() {
        // Seed default admin and user
        const defaultUser = {
            id: 'default-citizen-id',
            display_name: 'Asha Patil',
            role: 'citizen',
            preferred_language: 'en',
            created_at: new Date(),
            updated_at: new Date(),
        };
        const defaultVolunteer = {
            id: 'default-volunteer-id',
            display_name: 'Imran Khan',
            role: 'volunteer',
            preferred_language: 'mr',
            created_at: new Date(),
            updated_at: new Date(),
        };
        const defaultPartyLead = {
            id: 'default-party-id',
            display_name: 'Meera Deshmukh',
            role: 'party_lead',
            preferred_language: 'en',
            created_at: new Date(),
            updated_at: new Date(),
        };
        const defaultOfficer = {
            id: 'default-officer-id',
            display_name: 'Suresh Kumar',
            role: 'department_officer',
            preferred_language: 'hi',
            created_at: new Date(),
            updated_at: new Date(),
        };
        this.users.push(defaultUser, defaultVolunteer, defaultPartyLead, defaultOfficer);
        // Seed areas
        const maharashtra = {
            id: 'state-maharashtra-id',
            name: 'Maharashtra',
            type: 'state',
            created_at: new Date(),
        };
        const mumbaiCentral = {
            id: 'constituency-mumbai-south-central-id',
            name: 'Mumbai South Central',
            type: 'constituency',
            parent_id: maharashtra.id,
            created_at: new Date(),
        };
        const ward12 = {
            id: 'ward-12-id',
            name: 'Ward 12',
            type: 'ward',
            parent_id: mumbaiCentral.id,
            created_at: new Date(),
        };
        this.areas.push(maharashtra, mumbaiCentral, ward12);
        // Seed party profiles
        const party1 = {
            id: 'party-profile-1-id',
            name: 'People First Coalition',
            official_logo_url: 'https://r2.tgim.org/logos/pfc.png',
            is_verified: true,
            created_at: new Date(),
        };
        this.partyProfiles.push(party1);
    }
}
const memoryDb = new InMemoryDb();
export const dbService = {
    isPrismaEnabled: () => isPrismaEnabled,
    getPrisma: () => prisma,
    // --- Users Operations ---
    users: {
        findUnique: async (id) => {
            if (isPrismaEnabled && prisma) {
                return prisma.user.findUnique({ where: { id } });
            }
            return memoryDb.users.find(u => u.id === id) || null;
        },
        create: async (data) => {
            if (isPrismaEnabled && prisma) {
                return prisma.user.create({ data: data });
            }
            const newUser = {
                id: `user-${Math.random().toString(36).substr(2, 9)}`,
                ...data,
                created_at: new Date(),
                updated_at: new Date(),
            };
            memoryDb.users.push(newUser);
            return newUser;
        },
        updateRole: async (id, role) => {
            if (isPrismaEnabled && prisma) {
                return prisma.user.update({ where: { id }, data: { role } });
            }
            const user = memoryDb.users.find(u => u.id === id);
            if (!user)
                throw new Error('User not found');
            user.role = role;
            user.updated_at = new Date();
            return user;
        },
    },
    // --- Areas Operations ---
    areas: {
        findMany: async () => {
            if (isPrismaEnabled && prisma) {
                return prisma.area.findMany();
            }
            return memoryDb.areas;
        },
        findUnique: async (id) => {
            if (isPrismaEnabled && prisma) {
                return prisma.area.findUnique({ where: { id } });
            }
            return memoryDb.areas.find(a => a.id === id) || null;
        },
        search: async (query) => {
            if (isPrismaEnabled && prisma) {
                return prisma.area.findMany({
                    where: { name: { contains: query, mode: 'insensitive' } }
                });
            }
            const lower = query.toLowerCase();
            return memoryDb.areas.filter(a => a.name.toLowerCase().includes(lower));
        }
    },
    // --- Issues Operations ---
    issues: {
        create: async (data) => {
            if (isPrismaEnabled && prisma) {
                // Execute raw custom SQL to handle PostGIS geometry insertion if using Prisma
                const reporterIdSql = data.reporter_id ? `'${data.reporter_id}'::uuid` : 'NULL';
                const idempotencySql = data.idempotency_key ? `'${data.idempotency_key}'` : 'NULL';
                const exactGeom = `ST_SetSRID(ST_Point(${data.longitude}, ${data.latitude}), 4326)`;
                // Blur coordinates slightly (random jitter within ~200m) for public view
                const jitterLat = data.latitude + (Math.random() - 0.5) * 0.002;
                const jitterLng = data.longitude + (Math.random() - 0.5) * 0.002;
                const publicGeom = `ST_SetSRID(ST_Point(${jitterLng}, ${jitterLat}), 4326)`;
                const result = await prisma.$queryRawUnsafe(`
          INSERT INTO issues (
            reporter_id, category, description, severity, privacy, exact_location, public_location, idempotency_key
          ) VALUES (
            ${reporterIdSql}, '${data.category}', '${data.description}', '${data.severity}'::"IssueSeverity", '${data.privacy}'::"PrivacyLevel", ${exactGeom}, ${publicGeom}, ${idempotencySql}
          ) RETURNING id, reporter_id, cluster_id, area_id, category, description, severity, privacy, status, idempotency_key, created_at, updated_at;
        `);
                return result[0];
            }
            // Check idempotency
            if (data.idempotency_key) {
                const existing = memoryDb.issues.find(i => i.idempotency_key === data.idempotency_key);
                if (existing)
                    return existing;
            }
            const jitter = (Math.random() - 0.5) * 0.002;
            const newIssue = {
                id: `issue-${Math.random().toString(36).substr(2, 9)}`,
                reporter_id: data.reporter_id,
                category: data.category,
                description: data.description,
                severity: data.severity,
                privacy: data.privacy,
                exact_latitude: data.latitude,
                exact_longitude: data.longitude,
                public_latitude: data.privacy === 'public' ? data.latitude : data.latitude + jitter,
                public_longitude: data.privacy === 'public' ? data.longitude : data.longitude + jitter,
                status: 'open',
                idempotency_key: data.idempotency_key,
                created_at: new Date(),
                updated_at: new Date(),
            };
            // Assign ward-12 as default area for mock consistency
            newIssue.area_id = 'ward-12-id';
            memoryDb.issues.push(newIssue);
            return newIssue;
        },
        findUnique: async (id) => {
            if (isPrismaEnabled && prisma) {
                const issues = await prisma.$queryRawUnsafe(`
          SELECT id, reporter_id, cluster_id, area_id, category, description, severity, privacy, status, idempotency_key, 
                 ST_Y(exact_location::geometry) as exact_latitude, ST_X(exact_location::geometry) as exact_longitude,
                 ST_Y(public_location::geometry) as public_latitude, ST_X(public_location::geometry) as public_longitude,
                 created_at, updated_at
          FROM issues WHERE id = '${id}'::uuid
        `);
                return issues[0] || null;
            }
            return memoryDb.issues.find(i => i.id === id) || null;
        },
        findMany: async (filters) => {
            if (isPrismaEnabled && prisma) {
                let sql = `
          SELECT id, reporter_id, cluster_id, area_id, category, description, severity, privacy, status, idempotency_key, 
                 ST_Y(exact_location::geometry) as exact_latitude, ST_X(exact_location::geometry) as exact_longitude,
                 ST_Y(public_location::geometry) as public_latitude, ST_X(public_location::geometry) as public_longitude,
                 created_at, updated_at
          FROM issues WHERE 1=1
        `;
                if (filters.area_id)
                    sql += ` AND area_id = '${filters.area_id}'::uuid`;
                if (filters.category)
                    sql += ` AND category = '${filters.category}'`;
                return prisma.$queryRawUnsafe(sql);
            }
            return memoryDb.issues.filter(i => {
                if (filters.area_id && i.area_id !== filters.area_id)
                    return false;
                if (filters.category && i.category !== filters.category)
                    return false;
                return true;
            });
        },
        linkToCluster: async (issueId, clusterId) => {
            if (isPrismaEnabled && prisma) {
                await prisma.issue.update({ where: { id: issueId }, data: { cluster_id: clusterId, status: 'clustered' } });
                return;
            }
            const issue = memoryDb.issues.find(i => i.id === issueId);
            if (issue) {
                issue.cluster_id = clusterId;
                issue.status = 'clustered';
            }
        }
    },
    // --- Media Operations ---
    media: {
        create: async (data) => {
            if (isPrismaEnabled && prisma) {
                return prisma.issueMedia.create({ data: data });
            }
            const newMedia = {
                id: `media-${Math.random().toString(36).substr(2, 9)}`,
                ...data,
                created_at: new Date(),
            };
            memoryDb.media.push(newMedia);
            return newMedia;
        },
        findByIssue: async (issueId) => {
            if (isPrismaEnabled && prisma) {
                return prisma.issueMedia.findMany({ where: { issue_id: issueId } });
            }
            return memoryDb.media.filter(m => m.issue_id === issueId);
        }
    },
    // --- Supports Operations ---
    supports: {
        create: async (userId, issueId) => {
            if (isPrismaEnabled && prisma) {
                return prisma.issueSupport.create({ data: { user_id: userId, issue_id: issueId } });
            }
            const existing = memoryDb.supports.find(s => s.user_id === userId && s.issue_id === issueId);
            if (existing)
                return existing;
            const newSupport = {
                id: `support-${Math.random().toString(36).substr(2, 9)}`,
                user_id: userId,
                issue_id: issueId,
                created_at: new Date(),
            };
            memoryDb.supports.push(newSupport);
            return newSupport;
        },
        countByIssue: async (issueId) => {
            if (isPrismaEnabled && prisma) {
                return prisma.issueSupport.count({ where: { issue_id: issueId } });
            }
            return memoryDb.supports.filter(s => s.issue_id === issueId).length;
        },
        countByCluster: async (clusterId) => {
            if (isPrismaEnabled && prisma) {
                const result = await prisma.$queryRawUnsafe(`
          SELECT COUNT(s.id) as count 
          FROM issue_supports s
          JOIN issues i ON s.issue_id = i.id
          WHERE i.cluster_id = '${clusterId}'::uuid
        `);
                return Number(result[0]?.count || 0);
            }
            const issueIdsInCluster = memoryDb.issues.filter(i => i.cluster_id === clusterId).map(i => i.id);
            return memoryDb.supports.filter(s => issueIdsInCluster.includes(s.issue_id)).length;
        }
    },
    // --- Clusters Operations ---
    clusters: {
        create: async (data) => {
            if (isPrismaEnabled && prisma) {
                return prisma.issueCluster.create({ data });
            }
            const newCluster = {
                id: `cluster-${Math.random().toString(36).substr(2, 9)}`,
                ...data,
                priority_score: 0,
                status: 'draft',
                created_at: new Date(),
                updated_at: new Date(),
            };
            memoryDb.clusters.push(newCluster);
            return newCluster;
        },
        findMany: async (filters) => {
            if (isPrismaEnabled && prisma) {
                return prisma.issueCluster.findMany({ where: filters });
            }
            return memoryDb.clusters.filter(c => {
                if (filters.area_id && c.area_id !== filters.area_id)
                    return false;
                if (filters.category && c.category !== filters.category)
                    return false;
                return true;
            });
        },
        findUnique: async (id) => {
            if (isPrismaEnabled && prisma) {
                return prisma.issueCluster.findUnique({ where: { id } });
            }
            return memoryDb.clusters.find(c => c.id === id) || null;
        },
        updateScore: async (id, score, status) => {
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
                if (status)
                    cluster.status = status;
                cluster.updated_at = new Date();
            }
        }
    },
    // --- Verification Operations ---
    verifications: {
        create: async (data) => {
            if (isPrismaEnabled && prisma) {
                return prisma.verificationEvent.create({ data: data });
            }
            const newVerification = {
                id: `verification-${Math.random().toString(36).substr(2, 9)}`,
                ...data,
                created_at: new Date(),
            };
            memoryDb.verifications.push(newVerification);
            // Update cluster status based on verification outcome
            const cluster = memoryDb.clusters.find(c => c.id === data.cluster_id);
            if (cluster) {
                if (data.outcome === 'verified') {
                    cluster.status = 'verified';
                }
                else if (data.outcome === 'rejected') {
                    cluster.status = 'resolved'; // lock it
                }
            }
            return newVerification;
        },
        findByCluster: async (clusterId) => {
            if (isPrismaEnabled && prisma) {
                return prisma.verificationEvent.findMany({ where: { cluster_id: clusterId } });
            }
            return memoryDb.verifications.filter(v => v.cluster_id === clusterId);
        }
    },
    // --- Manifesto Operations ---
    manifestos: {
        createDraft: async (areaId) => {
            if (isPrismaEnabled && prisma) {
                // Find latest version
                const latest = await prisma.manifesto.findFirst({
                    where: { area_id: areaId },
                    orderBy: { version: 'desc' }
                });
                const nextVersion = latest ? latest.version + 1 : 1;
                return prisma.manifesto.create({
                    data: { area_id: areaId, version: nextVersion }
                });
            }
            const areaManifestos = memoryDb.manifestos.filter(m => m.area_id === areaId);
            const nextVersion = areaManifestos.length + 1;
            const newManifesto = {
                id: `manifesto-${Math.random().toString(36).substr(2, 9)}`,
                area_id: areaId,
                version: nextVersion,
                is_published: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            memoryDb.manifestos.push(newManifesto);
            return newManifesto;
        },
        findLatest: async (areaId) => {
            if (isPrismaEnabled && prisma) {
                return prisma.manifesto.findFirst({
                    where: { area_id: areaId },
                    orderBy: { version: 'desc' }
                });
            }
            const areaManifestos = memoryDb.manifestos.filter(m => m.area_id === areaId);
            if (areaManifestos.length === 0)
                return null;
            return areaManifestos.reduce((prev, current) => (prev.version > current.version) ? prev : current);
        },
        publish: async (id) => {
            if (isPrismaEnabled && prisma) {
                return prisma.manifesto.update({
                    where: { id },
                    data: { is_published: true }
                });
            }
            const manifesto = memoryDb.manifestos.find(m => m.id === id);
            if (!manifesto)
                throw new Error('Manifesto not found');
            manifesto.is_published = true;
            manifesto.updated_at = new Date();
            return manifesto;
        }
    },
    // --- Manifesto Promises Operations ---
    manifestoPromises: {
        create: async (data) => {
            if (isPrismaEnabled && prisma) {
                return prisma.manifestoPromise.create({ data: data });
            }
            const newPromise = {
                id: `promise-${Math.random().toString(36).substr(2, 9)}`,
                ...data,
                created_at: new Date(),
                updated_at: new Date(),
            };
            memoryDb.promises.push(newPromise);
            return newPromise;
        },
        findByManifesto: async (manifestoId) => {
            if (isPrismaEnabled && prisma) {
                return prisma.manifestoPromise.findMany({ where: { manifesto_id: manifestoId } });
            }
            return memoryDb.promises.filter(p => p.manifesto_id === manifestoId);
        },
        findUnique: async (id) => {
            if (isPrismaEnabled && prisma) {
                return prisma.manifestoPromise.findUnique({ where: { id } });
            }
            return memoryDb.promises.find(p => p.id === id) || null;
        }
    },
    // --- Party Adopted Promises Operations ---
    partyPromises: {
        adopt: async (data) => {
            if (isPrismaEnabled && prisma) {
                return prisma.partyPromise.create({
                    data: { ...data, status: 'adopted' }
                });
            }
            const newPartyPromise = {
                id: `party-promise-${Math.random().toString(36).substr(2, 9)}`,
                ...data,
                status: 'adopted',
                created_at: new Date(),
                updated_at: new Date(),
            };
            memoryDb.partyPromises.push(newPartyPromise);
            return newPartyPromise;
        },
        findMany: async (filters) => {
            if (isPrismaEnabled && prisma) {
                return prisma.partyPromise.findMany({ where: filters });
            }
            return memoryDb.partyPromises.filter(pp => {
                if (filters.party_id && pp.party_id !== filters.party_id)
                    return false;
                if (filters.status && pp.status !== filters.status)
                    return false;
                return true;
            });
        },
        findUnique: async (id) => {
            if (isPrismaEnabled && prisma) {
                return prisma.partyPromise.findUnique({ where: { id } });
            }
            return memoryDb.partyPromises.find(pp => pp.id === id) || null;
        },
        updateStatus: async (id, status) => {
            if (isPrismaEnabled && prisma) {
                return prisma.partyPromise.update({
                    where: { id },
                    data: { status }
                });
            }
            const pp = memoryDb.partyPromises.find(p => p.id === id);
            if (!pp)
                throw new Error('Party promise not found');
            pp.status = status;
            pp.updated_at = new Date();
            return pp;
        }
    },
    // --- Delivery Updates Operations ---
    deliveryUpdates: {
        create: async (data) => {
            if (isPrismaEnabled && prisma) {
                return prisma.deliveryUpdate.create({ data: data });
            }
            const newUpdate = {
                id: `delivery-update-${Math.random().toString(36).substr(2, 9)}`,
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
        findByPromise: async (partyPromiseId) => {
            if (isPrismaEnabled && prisma) {
                return prisma.deliveryUpdate.findMany({
                    where: { party_promise_id: partyPromiseId },
                    orderBy: { created_at: 'desc' }
                });
            }
            return memoryDb.deliveryUpdates
                .filter(du => du.party_promise_id === partyPromiseId)
                .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        }
    },
    // --- Audit Logging Operations ---
    audit: {
        log: async (data) => {
            if (isPrismaEnabled && prisma) {
                return prisma.auditEvent.create({ data });
            }
            const newAudit = {
                id: `audit-${Math.random().toString(36).substr(2, 9)}`,
                ...data,
                created_at: new Date(),
            };
            memoryDb.auditEvents.push(newAudit);
            return newAudit;
        },
        findMany: async () => {
            if (isPrismaEnabled && prisma) {
                return prisma.auditEvent.findMany({ orderBy: { created_at: 'desc' } });
            }
            return memoryDb.auditEvents.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        }
    }
};
