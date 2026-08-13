import type { CivicFormQuestion } from '@tgim/shared';

export const coreFormDefinitions: Array<{ slug: string; title: string; description: string; questions: CivicFormQuestion[] }> = [
  { slug: 'pin-a-problem', title: 'Pin a Problem', description: 'Record a local problem with structured category and severity.', questions: [
    { key: 'category', label: 'What is affected?', type: 'single_select', required: true, position: 0, options: ['water', 'roads', 'garbage', 'health', 'safety', 'jobs', 'transport', 'housing'].map(value => ({ value, label: value })) },
    { key: 'description', label: 'Describe the problem', type: 'long_text', required: true, position: 1 },
    { key: 'severity', label: 'How serious is it?', type: 'single_select', required: true, position: 2, options: ['low', 'medium', 'high', 'critical'].map(value => ({ value, label: value })) },
  ] },
  { slug: 'add-evidence', title: 'Add Evidence', description: 'Attach a processed public evidence reference to an existing civic record.', questions: [
    { key: 'evidence_url', label: 'Processed evidence', type: 'evidence', required: true, position: 0 },
    { key: 'notes', label: 'What does this show?', type: 'long_text', required: true, position: 1 },
  ] },
  { slug: 'volunteer-verification', title: 'Volunteer Verification', description: 'Submit an independent field verification without exposing resident identity.', questions: [
    { key: 'location_matches', label: 'Does the location match?', type: 'boolean', required: true, position: 0 },
    { key: 'notes', label: 'Verification notes', type: 'long_text', required: true, position: 1 },
  ] },
  { slug: 'suggest-fix', title: 'Suggest a Fix', description: 'Propose a concrete response for public and authority review.', questions: [
    { key: 'suggestion', label: 'What should happen next?', type: 'long_text', required: true, position: 0 },
  ] },
  { slug: 'delivery-progress-update', title: 'Delivery Progress Update', description: 'Publish a structured, evidence-linked delivery update.', questions: [
    { key: 'status', label: 'Current status', type: 'single_select', required: true, position: 0, options: ['on_track', 'delayed', 'completed', 'disputed', 'no_update'].map(value => ({ value, label: value })) },
    { key: 'update', label: 'Public update', type: 'long_text', required: true, position: 1 },
    { key: 'evidence_url', label: 'Public evidence', type: 'evidence', required: false, position: 2 },
  ] },
];
