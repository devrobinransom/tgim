import { Prisma, PrismaClient } from '@prisma/client';
import { coreFormDefinitions } from '../src/core-forms.js';

const prisma = new PrismaClient();
const stateId = '10000000-0000-4000-8000-000000000001';
const districtId = '10000000-0000-4000-8000-000000000002';
const wardId = '10000000-0000-4000-8000-000000000012';
const pincodes = [
  ['10000000-0000-4000-8000-000000400049', '400049 Juhu'],
  ['10000000-0000-4000-8000-000000400053', '400053 Andheri West'],
  ['10000000-0000-4000-8000-000000400054', '400054 Santacruz West'],
  ['10000000-0000-4000-8000-000000400058', '400058 Andheri East'],
  ['10000000-0000-4000-8000-000000400064', '400064 Malad West'],
  ['10000000-0000-4000-8000-000000400092', '400092 Borivali West'],
] as const;
const pincodeCentroids = [
  ['10000000-0000-4000-8000-000000400049', '400049', 'Juhu', 19.0889, 72.8322],
  ['10000000-0000-4000-8000-000000400053', '400053', 'Andheri West', 19.1137, 72.8538],
  ['10000000-0000-4000-8000-000000400054', '400054', 'Santacruz West', 19.1335, 72.8375],
  ['10000000-0000-4000-8000-000000400058', '400058', 'Andheri East', 19.1140, 72.8689],
  ['10000000-0000-4000-8000-000000400064', '400064', 'Malad West', 19.1900, 72.8550],
  ['10000000-0000-4000-8000-000000400092', '400092', 'Borivali West', 19.2270, 72.8550],
] as const;

async function seed() {
  await prisma.area.upsert({ where: { id: stateId }, update: {}, create: { id: stateId, name: 'Maharashtra', type: 'state' } });
  await prisma.area.upsert({ where: { id: districtId }, update: {}, create: { id: districtId, name: 'Mumbai Suburban District', type: 'district', parent_id: stateId } });
  await prisma.area.upsert({ where: { id: wardId }, update: {}, create: { id: wardId, name: 'Ward 12', type: 'ward', parent_id: districtId } });
  for (const [id, name] of pincodes) await prisma.area.upsert({ where: { id }, update: { name, parent_id: wardId }, create: { id, name, type: 'pincode', parent_id: wardId } });
  for (const [areaId, code, name, latitude, longitude] of pincodeCentroids) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO pincode_boundaries (id, pincode_code, name, area_id, centroid_latitude, centroid_longitude, boundary)
      VALUES (${areaId}::uuid, ${code}, ${name}, ${areaId}::uuid, ${latitude}, ${longitude}, ST_MakeEnvelope(${longitude - 0.01}, ${latitude - 0.01}, ${longitude + 0.01}, ${latitude + 0.01}, 4326))
      ON CONFLICT (pincode_code) DO UPDATE SET name = EXCLUDED.name, area_id = EXCLUDED.area_id,
        centroid_latitude = EXCLUDED.centroid_latitude, centroid_longitude = EXCLUDED.centroid_longitude, boundary = EXCLUDED.boundary
    `);
  }
  for (const authority of [
    { id: '20000000-0000-4000-8000-000000000001', name: 'Municipal Roads Department', category: 'roads', service_code: 'ROADS-POTHOLE', service_name: 'Road and pothole repair', description: 'Road surface, footpath, and pothole service requests.' },
    { id: '20000000-0000-4000-8000-000000000002', name: 'Municipal Hydraulic Department', category: 'water', service_code: 'WATER-SUPPLY', service_name: 'Water supply and waterlogging', description: 'Leaks, interrupted supply, and public waterlogging.' },
    { id: '20000000-0000-4000-8000-000000000003', name: 'Municipal Solid Waste Department', category: 'garbage', service_code: 'WASTE-COLLECTION', service_name: 'Waste collection', description: 'Missed collection, dumping, and sanitation requests.' },
  ]) await prisma.civicAuthority.upsert({ where: { id: authority.id }, update: { ...authority, jurisdiction_area_id: wardId, active: true }, create: { ...authority, jurisdiction_area_id: wardId, active: true } });

  const admin = await prisma.user.upsert({
    where: { id: '90000000-0000-4000-8000-000000000001' },
    update: { role: 'platform_admin' },
    create: { id: '90000000-0000-4000-8000-000000000001', display_name: 'TGIM Platform Bootstrap', role: 'platform_admin', preferred_language: 'en' },
  });
  for (const definition of coreFormDefinitions) {
    const form = await prisma.civicForm.upsert({
      where: { slug: definition.slug },
      update: { title: definition.title, status: 'published', active_version: 1 },
      create: { slug: definition.slug, title: definition.title, status: 'published', active_version: 1, created_by: admin.id },
    });
    const version = await prisma.civicFormVersion.upsert({
      where: { form_id_version: { form_id: form.id, version: 1 } },
      update: { status: 'published', published_at: new Date() },
      create: { form_id: form.id, version: 1, status: 'published', published_at: new Date(), created_by: admin.id },
    });
    await prisma.civicFormQuestion.deleteMany({ where: { form_version_id: version.id } });
    await prisma.civicFormQuestion.createMany({ data: definition.questions.map(question => ({ ...question, form_version_id: version.id, options: 'options' in question ? question.options : undefined })) as any });
  }
}

seed().finally(() => prisma.$disconnect());
