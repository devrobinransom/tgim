import type { CivicFormQuestion, CivicPoll } from '@tgim/shared';
import type { CivicFormDetail } from '@tgim/api-client';
import { randomUUID } from 'expo-crypto';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../../src/api';
import { Button } from '../../src/components/Button';
import { Screen, TopBar } from '../../src/components/ProductPrimitives';
import { ACTIVE_AREA_ID } from '../../src/config';
import { theme } from '../../src/theme';

const forms = [
  ['pin-a-problem', 'Problem'],
  ['add-evidence', 'Evidence'],
  ['volunteer-verification', 'Verify'],
  ['suggest-fix', 'Suggest'],
  ['delivery-progress-update', 'Progress'],
] as const;

type PollAnswer = {
  optionId?: string;
  ranking?: string[];
  allocation?: Record<string, number>;
  value?: number;
};

function Field({ question, value, onChange }: { question: CivicFormQuestion; value: unknown; onChange: (value: unknown) => void }) {
  if (question.type === 'single_select' || question.type === 'boolean') {
    const options = question.type === 'boolean' ? [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] : question.options || [];
    return <View style={{ gap: 8 }}><Text selectable style={{ color: theme.text, fontWeight: '700' }}>{question.label}{question.required ? ' *' : ''}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map(option => {
      const nextValue = question.type === 'boolean' ? option.value === 'true' : option.value;
      const active = value === nextValue;
      return <Pressable key={option.value} onPress={() => onChange(nextValue)} style={{ borderWidth: 1, borderColor: active ? theme.accent : theme.border, backgroundColor: active ? `${theme.accent}18` : theme.card, borderRadius: theme.radius.pill, paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: theme.text, fontWeight: '600' }}>{option.label}</Text></Pressable>;
    })}</View></View>;
  }
  if (question.type === 'multi_select') {
    const selected = Array.isArray(value) ? value as string[] : [];
    return <View style={{ gap: 8 }}><Text selectable style={{ color: theme.text, fontWeight: '700' }}>{question.label}{question.required ? ' *' : ''}</Text>{question.options?.map(option => <Pressable key={option.value} onPress={() => onChange(selected.includes(option.value) ? selected.filter(item => item !== option.value) : [...selected, option.value])} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: selected.includes(option.value) ? theme.accent : theme.textMuted }}>{selected.includes(option.value) ? '●' : '○'}</Text><Text style={{ color: theme.text }}>{option.label}</Text></Pressable>)}</View>;
  }
  if (question.type === 'rating') return <View style={{ gap: 8 }}><Text selectable style={{ color: theme.text, fontWeight: '700' }}>{question.label}{question.required ? ' *' : ''}</Text><View style={{ flexDirection: 'row', gap: 8 }}>{[1, 2, 3, 4, 5].map(item => <Pressable key={item} onPress={() => onChange(item)} style={{ borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: value === item ? theme.accent : theme.slate[100] }}><Text style={{ color: value === item ? '#fff' : theme.text, fontWeight: '700' }}>{item}</Text></Pressable>)}</View></View>;
  return <View style={{ gap: 6 }}><Text selectable style={{ color: theme.text, fontWeight: '700' }}>{question.label}{question.required ? ' *' : ''}</Text><TextInput multiline={question.type === 'long_text'} keyboardType={question.type === 'number' ? 'numeric' : 'default'} value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''} onChangeText={next => onChange(question.type === 'number' ? (next ? Number(next) : undefined) : next)} style={{ color: theme.text, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, borderRadius: theme.radius.md, padding: 12, minHeight: question.type === 'long_text' ? 90 : 46 }} /></View>;
}

function PollCard({ poll, answer, busy, onChange, onVote }: { poll: CivicPoll; answer: PollAnswer; busy: boolean; onChange: (answer: PollAnswer) => void; onVote: () => void }) {
  const options = poll.options || [];
  const allocationTotal = Object.values(answer.allocation || {}).reduce((sum, value) => sum + value, 0);
  const canVote = poll.type === 'single_choice'
    ? Boolean(answer.optionId)
    : poll.type === 'likert'
      ? Boolean(answer.value && answer.value >= 1 && answer.value <= 5)
      : poll.type === 'ranked_choice'
        ? Boolean(answer.ranking?.length)
        : options.length > 0 && allocationTotal === 100;

  return <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 10 }}>
    <Text selectable style={{ color: theme.text, fontWeight: '800' }}>{poll.question}</Text>
    {poll.description ? <Text selectable style={{ color: theme.textMuted }}>{poll.description}</Text> : null}
    {poll.type === 'single_choice' ? options.map(option => <Pressable key={option.id} onPress={() => onChange({ optionId: option.id })} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: answer.optionId === option.id ? theme.accent : theme.textMuted }}>{answer.optionId === option.id ? '●' : '○'}</Text><Text style={{ color: theme.text }}>{option.label}</Text></Pressable>) : null}
    {poll.type === 'likert' ? <View style={{ flexDirection: 'row', gap: 8 }}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} onPress={() => onChange({ value })} accessibilityLabel={`Rating ${value}`} style={{ borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: answer.value === value ? theme.accent : theme.slate[100] }}><Text style={{ color: answer.value === value ? '#fff' : theme.text, fontWeight: '700' }}>{value}</Text></Pressable>)}</View> : null}
    {poll.type === 'ranked_choice' ? <View style={{ gap: 8 }}><Text selectable style={{ color: theme.textMuted }}>Tap choices in preferred order.</Text>{options.map(option => {
      const rank = answer.ranking?.indexOf(option.id) ?? -1;
      return <Pressable key={option.id} disabled={rank >= 0} onPress={() => onChange({ ranking: [...(answer.ranking || []), option.id] })} style={{ borderWidth: 1, borderColor: rank >= 0 ? theme.accent : theme.border, borderRadius: theme.radius.md, padding: 10 }}><Text style={{ color: theme.text, fontWeight: '600' }}>{rank >= 0 ? `${rank + 1}. ` : ''}{option.label}</Text></Pressable>;
    })}{answer.ranking?.length ? <Pressable onPress={() => onChange({ ranking: [] })}><Text style={{ color: theme.accent, fontWeight: '700' }}>Reset ranking</Text></Pressable> : null}</View> : null}
    {poll.type === 'budget_allocation' ? <View style={{ gap: 10 }}>{options.map(option => <View key={option.id} style={{ gap: 6 }}><Text selectable style={{ color: theme.text, fontWeight: '600' }}>{option.label}</Text><TextInput accessibilityLabel={`${option.label} allocation`} keyboardType="numeric" value={String(answer.allocation?.[option.id] || 0)} onChangeText={raw => onChange({ allocation: { ...(answer.allocation || {}), [option.id]: Math.max(0, Number(raw) || 0) } })} style={{ color: theme.text, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius.md, padding: 10 }} /></View>)}<Text selectable style={{ color: allocationTotal === 100 ? theme.palette.success : theme.textMuted, fontWeight: '700' }}>{allocationTotal}/100 allocated</Text></View> : null}
    <Button label="Cast vote" disabled={busy || !canVote} onPress={onVote} />
  </View>;
}

export default function ParticipateScreen() {
  const [slug, setSlug] = useState<(typeof forms)[number][0]>('pin-a-problem');
  const [form, setForm] = useState<CivicFormDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [polls, setPolls] = useState<CivicPoll[]>([]);
  const [pollAnswers, setPollAnswers] = useState<Record<string, PollAnswer>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([api.forms.get(slug).catch(() => null), api.polls.list(ACTIVE_AREA_ID).catch(() => [])]).then(([nextForm, nextPolls]) => {
      if (active) { setForm(nextForm); setPolls(nextPolls); setAnswers({}); }
    });
    return () => { active = false; };
  }, [slug]);

  const submit = async () => {
    if (!form) return;
    setBusy(true); setMessage(null);
    try { await api.forms.submit(form.slug, { idempotency_key: randomUUID(), area_id: ACTIVE_AREA_ID, answers }); setMessage('Response accepted with a durable receipt.'); setAnswers({}); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Response could not be submitted.'); }
    finally { setBusy(false); }
  };

  const submitVote = async (poll: CivicPoll) => {
    const answer = pollAnswers[poll.id] || {};
    const payload = poll.type === 'single_choice'
      ? { option_id: answer.optionId }
      : poll.type === 'likert'
        ? { value: answer.value }
        : poll.type === 'ranked_choice'
          ? { ranking: answer.ranking }
          : { allocation: answer.allocation };
    setBusy(true); setMessage(null);
    try {
      await api.polls.vote(poll.id, { idempotency_key: randomUUID(), ...payload });
      setPollAnswers(current => ({ ...current, [poll.id]: {} }));
      setMessage('Vote accepted with a durable receipt.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Vote could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  return <Screen>
    <TopBar title="Participate" subtitle="Versioned forms and local polls" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{forms.map(([value, label]) => <Pressable key={value} onPress={() => setSlug(value)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: slug === value ? theme.accent : theme.border, backgroundColor: slug === value ? `${theme.accent}18` : theme.card }}><Text style={{ color: theme.text, fontWeight: '700' }}>{label}</Text></Pressable>)}</View>
    <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 14 }}>
      {form ? <><Text selectable style={{ color: theme.text, fontWeight: '900', fontSize: 19 }}>{form.title}</Text>{form.description ? <Text selectable style={{ color: theme.textMuted }}>{form.description}</Text> : null}{form.version.questions.map(question => <Field key={question.key} question={question} value={answers[question.key]} onChange={value => setAnswers(current => ({ ...current, [question.key]: value }))} />)}<Button label="Submit response" onPress={() => void submit()} disabled={busy} /></> : <><Text selectable style={{ color: theme.text, fontWeight: '800' }}>Published form unavailable</Text><Text selectable style={{ color: theme.textMuted }}>The server has not published this workflow in the current environment.</Text></>}
    </View>
    <Text selectable style={{ color: theme.text, fontWeight: '900', fontSize: 18 }}>Open local polls</Text>
    {polls.length === 0 ? <Text selectable style={{ color: theme.textMuted }}>No poll is open for this area.</Text> : polls.map(poll => <PollCard key={poll.id} poll={poll} answer={pollAnswers[poll.id] || {}} busy={busy} onChange={answer => setPollAnswers(current => ({ ...current, [poll.id]: answer }))} onVote={() => void submitVote(poll)} />)}
    {message ? <Text selectable style={{ color: theme.textMuted }}>{message}</Text> : null}
  </Screen>;
}
