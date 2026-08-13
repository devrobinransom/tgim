'use client';

import type { CivicFormQuestion, CivicPoll } from '@tgim/shared';
import type { CivicFormDetail } from '@tgim/api-client';
import { CheckCircle2, ClipboardList, Vote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AREA_ID } from '../lib/portal';
import { usePortalApi } from '../lib/useDashboardData';
import { Button, EmptyState, PageHeader, Panel } from '../ui/primitives';

const coreForms = [
  ['pin-a-problem', 'Pin a problem'],
  ['add-evidence', 'Add evidence'],
  ['volunteer-verification', 'Volunteer verification'],
  ['suggest-fix', 'Suggest a fix'],
  ['delivery-progress-update', 'Delivery progress update'],
] as const;

function Question({ question, value, onChange }: { question: CivicFormQuestion; value: unknown; onChange: (value: unknown) => void }) {
  const id = `question-${question.key}`;
  if (question.type === 'boolean') return <label className="field-label" htmlFor={id}>{question.label}{question.required ? ' *' : ''}<select id={id} value={value === true ? 'yes' : value === false ? 'no' : ''} onChange={event => onChange(event.target.value === '' ? undefined : event.target.value === 'yes')}><option value="">Choose</option><option value="yes">Yes</option><option value="no">No</option></select></label>;
  if (question.type === 'single_select') return <label className="field-label" htmlFor={id}>{question.label}{question.required ? ' *' : ''}<select id={id} value={typeof value === 'string' ? value : ''} onChange={event => onChange(event.target.value || undefined)}><option value="">Choose</option>{question.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  if (question.type === 'multi_select') {
    const selected = Array.isArray(value) ? value as string[] : [];
    return <fieldset className="field-label"><legend>{question.label}{question.required ? ' *' : ''}</legend>{question.options?.map(option => <label key={option.value} className="checkbox-row"><input type="checkbox" checked={selected.includes(option.value)} onChange={event => onChange(event.target.checked ? [...selected, option.value] : selected.filter(item => item !== option.value))} /> {option.label}</label>)}</fieldset>;
  }
  if (question.type === 'long_text') return <label className="field-label" htmlFor={id}>{question.label}{question.required ? ' *' : ''}<textarea id={id} value={typeof value === 'string' ? value : ''} onChange={event => onChange(event.target.value)} /></label>;
  if (question.type === 'rating') return <label className="field-label" htmlFor={id}>{question.label}{question.required ? ' *' : ''}<select id={id} value={typeof value === 'number' ? value : ''} onChange={event => onChange(event.target.value ? Number(event.target.value) : undefined)}><option value="">Choose 1–5</option>{[1, 2, 3, 4, 5].map(item => <option key={item} value={item}>{item}</option>)}</select></label>;
  return <label className="field-label" htmlFor={id}>{question.label}{question.required ? ' *' : ''}<input id={id} type={question.type === 'number' ? 'number' : question.type === 'evidence' ? 'url' : 'text'} value={typeof value === 'string' || typeof value === 'number' ? value : ''} onChange={event => onChange(question.type === 'number' ? (event.target.value ? Number(event.target.value) : undefined) : event.target.value)} /></label>;
}

export function ParticipationPage() {
  const api = usePortalApi();
  const [slug, setSlug] = useState<(typeof coreForms)[number][0]>('pin-a-problem');
  const [form, setForm] = useState<CivicFormDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [polls, setPolls] = useState<CivicPoll[]>([]);
  const [pollAnswers, setPollAnswers] = useState<Record<string, { optionId?: string; value?: number; ranking?: string[]; allocation?: Record<string, number> }>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([api.forms.get(slug).catch(() => null), api.polls.list(AREA_ID).catch(() => [])]).then(([nextForm, nextPolls]) => {
      if (!active) return;
      setForm(nextForm); setPolls(nextPolls); setAnswers({});
    });
    return () => { active = false; };
  }, [api, slug]);

  const submitForm = async () => {
    if (!form) return;
    setBusy(true); setMessage(null);
    try {
      await api.forms.submit(form.slug, { idempotency_key: crypto.randomUUID(), area_id: AREA_ID, answers });
      setMessage('Response accepted with a durable receipt.'); setAnswers({});
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Response could not be submitted.'); }
    finally { setBusy(false); }
  };

  const submitVote = async (poll: CivicPoll) => {
    const response = pollAnswers[poll.id] || {};
    const payload = poll.type === 'single_choice' ? { option_id: response.optionId } : poll.type === 'likert' ? { value: response.value } : poll.type === 'ranked_choice' ? { ranking: response.ranking } : { allocation: response.allocation };
    setBusy(true); setMessage(null);
    try {
      await api.polls.vote(poll.id, { idempotency_key: crypto.randomUUID(), ...payload });
      setMessage('Vote accepted. Public results remain suppressed below the privacy threshold.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Vote could not be submitted.'); }
    finally { setBusy(false); }
  };

  return <div className="page-stack">
    <PageHeader title="Civic participation" description="Versioned forms preserve the exact questions you answered. Poll eligibility is area-bound and results stay suppressed below the privacy threshold." eyebrow={<><Vote size={16} /> Resident workspace</>} />
    <section className="workspace-grid">
      <Panel className="span-2" title="Civic forms" description="Choose a workflow; published definitions come from the server.">
        <div className="filter-bar">{coreForms.map(([value, label]) => <button className={slug === value ? 'active' : ''} key={value} onClick={() => setSlug(value)}>{label}</button>)}</div>
        {form ? <div className="form-stack"><h3>{form.title}</h3>{form.description ? <p>{form.description}</p> : null}{form.version.questions.map(question => <Question key={question.key} question={question} value={answers[question.key]} onChange={value => setAnswers(current => ({ ...current, [question.key]: value }))} />)}<Button variant="primary" disabled={busy} onClick={() => void submitForm()}><ClipboardList size={16} /> Submit response</Button></div> : <EmptyState title="Published form unavailable" copy="The definition may not be seeded in this environment yet." />}
      </Panel>
      <Panel title="Open local polls" description="One person, one area-bound vote.">
        {polls.length === 0 ? <EmptyState title="No poll is open" copy="Published polls appear here only during their configured window." /> : polls.map(poll => {
          const current = pollAnswers[poll.id] || {}; const options = poll.options || [];
          return <article className="form-stack" key={poll.id}><strong>{poll.question}</strong><p>{poll.description}</p>
            {poll.type === 'single_choice' ? options.map(option => <label className="checkbox-row" key={option.id}><input type="radio" name={poll.id} checked={current.optionId === option.id} onChange={() => setPollAnswers(value => ({ ...value, [poll.id]: { optionId: option.id } }))} /> {option.label}</label>) : null}
            {poll.type === 'likert' ? <label className="field-label">Rating<select value={current.value || ''} onChange={event => setPollAnswers(value => ({ ...value, [poll.id]: { value: Number(event.target.value) } }))}><option value="">Choose 1–5</option>{[1, 2, 3, 4, 5].map(value => <option key={value}>{value}</option>)}</select></label> : null}
            {poll.type === 'ranked_choice' ? <><p>Select choices in preferred order.</p>{options.map(option => <button className="button secondary" key={option.id} disabled={current.ranking?.includes(option.id)} onClick={() => setPollAnswers(value => ({ ...value, [poll.id]: { ranking: [...(current.ranking || []), option.id] } }))}>{(current.ranking?.indexOf(option.id) ?? -1) >= 0 ? `${(current.ranking?.indexOf(option.id) ?? 0) + 1}. ` : ''}{option.label}</button>)}</> : null}
            {poll.type === 'budget_allocation' ? options.map(option => <label className="field-label" key={option.id}>{option.label}<input type="number" min="0" max="100" value={current.allocation?.[option.id] || 0} onChange={event => setPollAnswers(value => ({ ...value, [poll.id]: { allocation: { ...(current.allocation || {}), [option.id]: Number(event.target.value) } } }))} /></label>) : null}
            <Button disabled={busy} onClick={() => void submitVote(poll)}>Cast vote</Button><small>Closes {new Date(poll.ends_at).toLocaleString('en-IN')}</small>
          </article>;
        })}
      </Panel>
    </section>
    {message ? <p className="action-message"><CheckCircle2 size={16} /> {message}</p> : null}
  </div>;
}
