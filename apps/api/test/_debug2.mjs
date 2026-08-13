import { buildApp } from '../dist/app.js';
import { dbService } from '../dist/services/db.service.js';

const app = buildApp();

const jsonHeaders = { 'content-type': 'application/json' };
const role = value => ({ ...jsonHeaders, 'x-tgim-demo-role': value });

const res = await app.inject({
  method: 'POST', url: '/api/v1/manifesto/generate', headers: role('party_lead'),
  payload: { areaId: 'ward-12-id' },
});
console.log('STATUS:', res.statusCode);
console.log('BODY:', res.body);
await app.close();
