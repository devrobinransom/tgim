import 'dotenv/config';
import { dbService } from '../dist/services/db.service.js';
import { buildApp } from '../dist/app.js';

console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('isPrismaEnabled:', dbService.isPrismaEnabled());

const app = buildApp();
const jsonHeaders = { 'content-type': 'application/json' };
const role = value => ({ ...jsonHeaders, 'x-tgim-demo-role': value });

const clusters = await dbService.clusters.findMany({ area_id: 'ward-12-id' });
console.log('cluster count:', clusters.length);

const res = await app.inject({
  method: 'POST', url: '/api/v1/manifesto/generate', headers: role('party_lead'),
  payload: { areaId: 'ward-12-id' },
});
console.log('generate status:', res.statusCode, 'body:', res.body.slice(0, 200));
await app.close();
