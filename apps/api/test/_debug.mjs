import { buildApp } from '../dist/app.js';
import { dbService } from '../dist/services/db.service.js';

const app = buildApp();
const clusters = await dbService.clusters.findMany({ area_id: 'ward-12-id' });
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('clusters for ward-12:', JSON.stringify(clusters, null, 2));
const verified = clusters.filter(c => c.status === 'verified' || (!process.env.DATABASE_URL && c.status === 'draft'));
console.log('verifiedClusters:', verified.length);
const manifestos = await dbService.manifestos.findLatest('ward-12-id');
console.log('latest manifesto:', manifestos?.id, manifestos?.version, manifestos?.is_published);
await app.close();
