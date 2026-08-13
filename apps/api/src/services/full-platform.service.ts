import type {
  CivicForm,
  CivicFormQuestion,
  CivicFormResponseSession,
  CivicFormVersion,
  CivicPoll,
  CivicPollOption,
  CivicPollResults,
  CivicPollVote,
  PollType,
  User,
} from '@tgim/shared';
import { dbService } from './db.service.js';
import { coreFormDefinitions } from '../core-forms.js';

type CreateFormInput = {
  slug: string;
  title: string;
  description?: string;
  questions: CivicFormQuestion[];
};

type FormRecord = CivicForm & { version: CivicFormVersion };
const memoryForms: FormRecord[] = coreFormDefinitions.map(definition => {
  const now = new Date();
  const formId = crypto.randomUUID();
  return {
    id: formId,
    slug: definition.slug,
    title: definition.title,
    description: definition.description,
    status: 'published',
    active_version: 1,
    created_by: 'default-admin-id',
    created_at: now,
    updated_at: now,
    version: { id: crypto.randomUUID(), form_id: formId, version: 1, status: 'published', questions: definition.questions, published_at: now, created_by: 'default-admin-id', created_at: now },
  };
});
const memoryFormResponses: CivicFormResponseSession[] = [];
const memoryPolls: Array<CivicPoll & { options: CivicPollOption[] }> = [];
const memoryPollVotes: CivicPollVote[] = [];

function questionsFromDb(items: any[]): CivicFormQuestion[] {
  return items.map(item => ({
    key: item.key,
    label: item.label,
    type: item.type,
    required: item.required,
    position: item.position,
    options: item.options ?? undefined,
    validation: item.validation ?? undefined,
  })).sort((a, b) => a.position - b.position);
}

function formRecordFromDb(form: any, version: any): FormRecord {
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description ?? undefined,
    status: form.status,
    active_version: form.active_version,
    created_by: form.created_by,
    created_at: form.created_at,
    updated_at: form.updated_at,
    version: {
      id: version.id,
      form_id: form.id,
      version: version.version,
      status: version.status,
      questions: questionsFromDb(version.questions || []),
      published_at: version.published_at ?? undefined,
      created_by: version.created_by,
      created_at: version.created_at,
    },
  };
}

function validateAnswers(questions: CivicFormQuestion[], answers: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const byKey = new Map(questions.map(question => [question.key, question]));
  for (const key of Object.keys(answers)) if (!byKey.has(key)) errors.push(`${key}: unknown question`);
  for (const question of questions) {
    const answer = answers[question.key];
    if (question.required && (answer === undefined || answer === null || answer === '')) {
      errors.push(`${question.key}: answer is required`);
      continue;
    }
    if (answer === undefined || answer === null) continue;
    const allowed = new Set((question.options || []).map(option => option.value));
    if (['text', 'long_text', 'evidence'].includes(question.type) && typeof answer !== 'string') errors.push(`${question.key}: must be text`);
    if (question.type === 'number' && typeof answer !== 'number') errors.push(`${question.key}: must be a number`);
    if (question.type === 'boolean' && typeof answer !== 'boolean') errors.push(`${question.key}: must be true or false`);
    if (question.type === 'rating' && (typeof answer !== 'number' || answer < 1 || answer > 5)) errors.push(`${question.key}: must be a rating from 1 to 5`);
    if (question.type === 'single_select' && (typeof answer !== 'string' || !allowed.has(answer))) errors.push(`${question.key}: invalid option`);
    if (question.type === 'multi_select' && (!Array.isArray(answer) || answer.some(value => typeof value !== 'string' || !allowed.has(value)))) errors.push(`${question.key}: invalid options`);
  }
  return errors;
}

export const formService = {
  async create(input: CreateFormInput, actorId: string): Promise<FormRecord> {
    const prisma = dbService.getPrisma() as any;
    if (prisma) {
      const form = await prisma.civicForm.create({
        data: {
          slug: input.slug,
          title: input.title,
          description: input.description,
          created_by: actorId,
          versions: {
            create: {
              version: 1,
              created_by: actorId,
              questions: { create: input.questions.map(question => ({ ...question, options: question.options, validation: question.validation })) },
            },
          },
        },
        include: { versions: { include: { questions: true } } },
      });
      return formRecordFromDb(form, form.versions[0]);
    }
    const now = new Date();
    const form: CivicForm = { id: crypto.randomUUID(), slug: input.slug, title: input.title, description: input.description, status: 'draft', active_version: 1, created_by: actorId, created_at: now, updated_at: now };
    const version: CivicFormVersion = { id: crypto.randomUUID(), form_id: form.id, version: 1, status: 'draft', questions: input.questions, created_by: actorId, created_at: now };
    const record = { ...form, version };
    memoryForms.push(record);
    return record;
  },

  async publish(slug: string): Promise<FormRecord | null> {
    const prisma = dbService.getPrisma() as any;
    if (prisma) {
      const current = await prisma.civicForm.findUnique({ where: { slug }, include: { versions: { where: { status: 'draft' }, orderBy: { version: 'desc' }, take: 1, include: { questions: true } } } });
      const version = current?.versions[0];
      if (!current || !version) return null;
      const now = new Date();
      const [form, published] = await prisma.$transaction([
        prisma.civicForm.update({ where: { id: current.id }, data: { status: 'published', active_version: version.version } }),
        prisma.civicFormVersion.update({ where: { id: version.id }, data: { status: 'published', published_at: now }, include: { questions: true } }),
      ]);
      return formRecordFromDb(form, published);
    }
    const record = memoryForms.find(item => item.slug === slug);
    if (!record) return null;
    const publishedAt = new Date();
    record.status = 'published';
    record.updated_at = publishedAt;
    record.version.status = 'published';
    record.version.published_at = publishedAt;
    return record;
  },

  async findPublished(slug: string): Promise<FormRecord | null> {
    const prisma = dbService.getPrisma() as any;
    if (prisma) {
      const form = await prisma.civicForm.findFirst({ where: { slug, status: 'published' }, include: { versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1, include: { questions: true } } } });
      return form?.versions[0] ? formRecordFromDb(form, form.versions[0]) : null;
    }
    return memoryForms.find(item => item.slug === slug && item.status === 'published') ?? null;
  },

  async submit(slug: string, actorId: string, input: { idempotency_key: string; area_id?: string; answers: Record<string, unknown> }): Promise<CivicFormResponseSession> {
    const form = await this.findPublished(slug);
    if (!form) throw new Error('Published form not found');
    const errors = validateAnswers(form.version.questions, input.answers);
    if (errors.length) throw new Error(errors.join('; '));
    const prisma = dbService.getPrisma() as any;
    if (prisma) {
      const existing = await prisma.civicFormResponseSession.findUnique({ where: { idempotency_key: input.idempotency_key } });
      if (existing) return existing;
      return prisma.civicFormResponseSession.create({
        data: {
          form_version_id: form.version.id,
          actor_id: actorId,
          area_id: input.area_id,
          idempotency_key: input.idempotency_key,
          answers: input.answers,
          responses: { create: Object.entries(input.answers).map(([question_key, answer]) => ({ question_key, answer })) },
        },
      });
    }
    const existing = memoryFormResponses.find(item => item.idempotency_key === input.idempotency_key);
    if (existing) return existing;
    const now = new Date();
    const session: CivicFormResponseSession = { id: crypto.randomUUID(), form_version_id: form.version.id, actor_id: actorId, area_id: input.area_id, idempotency_key: input.idempotency_key, state: 'submitted', answers: input.answers, created_at: now, updated_at: now };
    memoryFormResponses.push(session);
    return session;
  },

  async listResponses(slug: string): Promise<CivicFormResponseSession[]> {
    const prisma = dbService.getPrisma() as any;
    if (prisma) return prisma.civicFormResponseSession.findMany({ where: { form_version: { form: { slug } } }, orderBy: { created_at: 'desc' }, take: 500 });
    const form = memoryForms.find(item => item.slug === slug);
    return form ? memoryFormResponses.filter(item => item.form_version_id === form.version.id) : [];
  },
};

type CreatePollInput = {
  area_id: string;
  question: string;
  description?: string;
  type: PollType;
  starts_at: string;
  ends_at: string;
  options: Array<{ label: string; value: string }>;
  eligibility?: Record<string, unknown>;
};

function pollFromDb(item: any): CivicPoll & { options: CivicPollOption[] } {
  return { ...item, options: (item.options || []).sort((a: CivicPollOption, b: CivicPollOption) => a.position - b.position) };
}

export const pollService = {
  async create(input: CreatePollInput, actorId: string): Promise<CivicPoll> {
    const prisma = dbService.getPrisma() as any;
    if (prisma) return prisma.civicPoll.create({ data: { ...input, starts_at: new Date(input.starts_at), ends_at: new Date(input.ends_at), created_by: actorId, options: { create: input.options.map((option, position) => ({ ...option, position })) } }, include: { options: true } });
    const now = new Date();
    const poll: CivicPoll & { options: CivicPollOption[] } = { id: crypto.randomUUID(), area_id: input.area_id, question: input.question, description: input.description, type: input.type, status: 'draft', starts_at: new Date(input.starts_at), ends_at: new Date(input.ends_at), eligibility: input.eligibility, created_by: actorId, created_at: now, updated_at: now, options: [] };
    poll.options = input.options.map((option, position) => ({ id: crypto.randomUUID(), poll_id: poll.id, ...option, position }));
    memoryPolls.push(poll);
    return poll;
  },

  async publish(id: string): Promise<CivicPoll | null> {
    const prisma = dbService.getPrisma() as any;
    if (prisma) {
      const exists = await prisma.civicPoll.findUnique({ where: { id } });
      return exists ? prisma.civicPoll.update({ where: { id }, data: { status: 'published' }, include: { options: true } }) : null;
    }
    const poll = memoryPolls.find(item => item.id === id);
    if (!poll) return null;
    poll.status = 'published'; poll.updated_at = new Date(); return poll;
  },

  async listActive(areaId?: string): Promise<CivicPoll[]> {
    const now = new Date();
    const prisma = dbService.getPrisma() as any;
    if (prisma) return prisma.civicPoll.findMany({ where: { status: 'published', starts_at: { lte: now }, ends_at: { gt: now }, ...(areaId ? { area_id: areaId } : {}) }, include: { options: true }, orderBy: { ends_at: 'asc' } });
    return memoryPolls.filter(item => item.status === 'published' && item.starts_at <= now && item.ends_at > now && (!areaId || item.area_id === areaId));
  },

  async find(id: string): Promise<(CivicPoll & { options: CivicPollOption[] }) | null> {
    const prisma = dbService.getPrisma() as any;
    if (prisma) { const item = await prisma.civicPoll.findUnique({ where: { id }, include: { options: true } }); return item ? pollFromDb(item) : null; }
    return memoryPolls.find(item => item.id === id) ?? null;
  },

  async vote(pollId: string, actor: User, input: { idempotency_key: string; option_id?: string; ranking?: string[]; allocation?: Record<string, number>; value?: number }): Promise<CivicPollVote> {
    const poll = await this.find(pollId);
    if (!poll || poll.status !== 'published' || poll.starts_at > new Date() || poll.ends_at <= new Date()) throw new Error('Poll is not open');
    if (actor.role !== 'platform_admin' && actor.home_area_id !== poll.area_id) throw new Error('Actor is not eligible for this poll area');
    const optionIds = new Set(poll.options.map(option => option.id));
    if (poll.type === 'single_choice' && (!input.option_id || !optionIds.has(input.option_id))) throw new Error('A valid poll option is required');
    if (poll.type === 'ranked_choice' && (!input.ranking || input.ranking.some(id => !optionIds.has(id)) || new Set(input.ranking).size !== input.ranking.length)) throw new Error('A unique ranking of valid options is required');
    if (poll.type === 'budget_allocation') {
      const entries = Object.entries(input.allocation || {});
      if (!entries.length || entries.some(([id]) => !optionIds.has(id)) || entries.reduce((sum, [, value]) => sum + value, 0) !== 100) throw new Error('Budget allocation must assign exactly 100 points to valid options');
    }
    if (poll.type === 'likert' && (!input.value || input.value < 1 || input.value > 5)) throw new Error('A Likert value from 1 to 5 is required');
    const prisma = dbService.getPrisma() as any;
    if (prisma) {
      const existing = await prisma.civicPollVote.findUnique({ where: { idempotency_key: input.idempotency_key } });
      if (existing) return existing;
      return prisma.civicPollVote.create({ data: { poll_id: pollId, actor_id: actor.id, idempotency_key: input.idempotency_key, option_id: input.option_id, ranking: input.ranking || [], allocation: input.allocation, value: input.value } });
    }
    const existing = memoryPollVotes.find(item => item.idempotency_key === input.idempotency_key);
    if (existing) return existing;
    if (memoryPollVotes.some(item => item.poll_id === pollId && item.actor_id === actor.id)) throw new Error('Actor has already voted in this poll');
    const vote: CivicPollVote = { id: crypto.randomUUID(), poll_id: pollId, actor_id: actor.id, idempotency_key: input.idempotency_key, option_id: input.option_id, ranking: input.ranking, allocation: input.allocation, value: input.value, created_at: new Date() };
    memoryPollVotes.push(vote); return vote;
  },

  async results(pollId: string): Promise<CivicPollResults | null> {
    const poll = await this.find(pollId);
    if (!poll) return null;
    const prisma = dbService.getPrisma() as any;
    const votes: CivicPollVote[] = prisma ? await prisma.civicPollVote.findMany({ where: { poll_id: pollId } }) : memoryPollVotes.filter(item => item.poll_id === pollId);
    const threshold = Math.max(1, Number(process.env.POLL_PUBLICATION_THRESHOLD || 5));
    if (votes.length < threshold) return { poll_id: pollId, sample_size: votes.length, suppressed: true, counts: [], generated_at: new Date() };
    const counts = new Map<string, number>(poll.options.map(option => [option.id, 0]));
    for (const vote of votes) {
      const choices = vote.option_id ? [vote.option_id] : vote.ranking?.slice(0, 1) || Object.keys(vote.allocation || {});
      for (const choice of choices) counts.set(choice, (counts.get(choice) || 0) + (vote.allocation?.[choice] || 1));
    }
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0) || 1;
    return { poll_id: pollId, sample_size: votes.length, suppressed: false, counts: poll.options.map(option => ({ option_id: option.id, label: option.label, count: counts.get(option.id) || 0, percentage: Math.round(((counts.get(option.id) || 0) / total) * 1000) / 10 })), generated_at: new Date() };
  },
};

export const aggregateService = {
  async pincode(code: string) {
    const prisma = dbService.getPrisma() as any;
    if (prisma) {
      const rows = await prisma.$queryRawUnsafe('SELECT pincode_code, report_count, resolved_report_count, cluster_count, last_updated FROM mv_pincode_aggregates WHERE pincode_code = $1', code);
      return rows[0] ?? null;
    }
    const issues = (await dbService.issues.findMany({})).filter(issue => issue.visibility === 'public' && issue.pincode_code === code);
    return { pincode_code: code, report_count: issues.length, resolved_report_count: issues.filter(issue => issue.status === 'resolved').length, cluster_count: new Set(issues.map(issue => issue.cluster_id).filter(Boolean)).size, last_updated: issues.reduce<Date | null>((latest, issue) => !latest || issue.updated_at > latest ? issue.updated_at : latest, null) };
  },

  async refresh() {
    const prisma = dbService.getPrisma() as any;
    if (!prisma) return { refreshed: false, reason: 'in_memory' };
    for (const view of ['mv_public_issues_safe', 'mv_cluster_priority', 'mv_pincode_aggregates', 'mv_area_dashboard_summary', 'mv_audit_summary']) {
      await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
    }
    return { refreshed: true, at: new Date() };
  },
};
