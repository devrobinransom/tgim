import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { PromiseAccountabilityRecord, PromiseMilestone, PromiseOutcomeScore } from '@tgim/shared';
import { useI18n } from '../../src/i18n';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/typography';
import { EmptyState, MilestoneJourney, Screen, StatusChip, TopBar } from '../../src/components/ProductPrimitives';
import { api } from '../../src/api';
import { useFetch } from '../../src/hooks/useFetch';
import { theme } from '../../src/theme';

const MILESTONE_STATUS_TO_STATE = {
  pending: 'pending',
  in_progress: 'current',
  completed: 'complete',
  verified: 'complete',
  disputed: 'disputed',
} as const;

export default function PromiseDetailScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const fetchRecord = useCallback(() => api.party.accountability(String(id)), [id]);
  const { data: record, loading } = useFetch(fetchRecord);

  const journey = useMemo(() => buildJourney(record), [record]);
  const verdictCounts = record?.outcome.verdict_counts;

  return (
    <Screen>
      <TopBar title={record?.promise?.adopted_title ?? t('promises')} subtitle={t('deliveryJourney')} right={
        <Button label={t('back')} variant="secondary" onPress={() => router.back()} />
      } />

      {loading && <Text role="body" color={theme.textMuted}>{t('loading')}</Text>}
      {!loading && !record && (
        <EmptyState icon="trail-sign" title={t('noDeliverableYet')} body={t('noAdoptedYetBody')} />
      )}

      {record && (
        <>
          <StatusChip status={record.promise.status} />
          <Text role="h2" color={theme.text}>{record.promise.adopted_title}</Text>
          <Text role="body" color={theme.textMuted}>{record.promise.adopted_description}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <MetaPill icon="flag" label={`${t('due')}: ${record.promise.timeline ? new Date(record.promise.timeline).toLocaleDateString() : '—'}`} />
            {record.promise.owner_department ? <MetaPill icon="business" label={record.promise.owner_department} /> : null}
            {record.promise.target_metric ? <MetaPill icon="stats-chart" label={record.promise.target_metric} /> : null}
          </View>

          {record.promise.status === 'delayed' ? (
            <Note color={theme.palette.danger} icon="alert-circle" text={t('delayedNotice')} />
          ) : record.promise.status === 'no_update' ? (
            <Note color={theme.palette.warning} icon="warning" text={t('needsUpdateNotice')} />
          ) : null}

          {/* Delivery journey */}
          <MilestoneJourney items={journey} emptyTitle={t('noMilestonesTitle')} emptyBody={t('noMilestonesBody')} />

          {/* Citizen verdict */}
          {verdictCounts && Object.values(verdictCounts).some((count) => count > 0) && (
            <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: theme.spacing.md }}>
              <Text role="h3" color={theme.text}>{t('citizenVerdict')}</Text>
              <VerdictBar label={t('verdictDelivered')} count={verdictCounts.delivered} total={totalVerdicts(verdictCounts)} color={theme.palette.success} responsesLabel={t('verdictResponses')} />
              <VerdictBar label={t('verdictPartly')} count={verdictCounts.partly_delivered} total={totalVerdicts(verdictCounts)} color={theme.palette.info} responsesLabel={t('verdictResponses')} />
              <VerdictBar label={t('verdictNotDelivered')} count={verdictCounts.not_delivered} total={totalVerdicts(verdictCounts)} color={theme.palette.danger} responsesLabel={t('verdictResponses')} />
              <VerdictBar label={t('verdictNotSure')} count={verdictCounts.not_sure} total={totalVerdicts(verdictCounts)} color={theme.slate[500]} responsesLabel={t('verdictResponses')} />
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

type JourneyPair = { item: PromiseMilestone; state: 'complete' | 'current' | 'pending' | 'disputed' };

function buildJourney(record: PromiseAccountabilityRecord | null) {
  if (!record) return [];
  const milestones = [...record.milestones].sort((a, b) => a.sequence - b.sequence);
  const states: JourneyPair[] = milestones.map((item) => ({
    item,
    state: MILESTONE_STATUS_TO_STATE[item.status] ?? 'pending',
  }));

  const withDates: { label: string; value?: string; state: 'complete' | 'current' | 'pending' | 'disputed'; date?: string; evidenceUrl?: string }[] =
    states.map(({ item, state }) => ({
      label: item.title,
      value: item.description,
      state,
      date: item.completed_at ? new Date(item.completed_at).toLocaleDateString() : item.due_at ? new Date(item.due_at).toLocaleDateString() : undefined,
      evidenceUrl: item.evidence_url,
    }));

  return withDates;
}

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs }}>
      <Ionicons name={icon} size={13} color={theme.textMuted} />
      <Text role="small" color={theme.text}>{label}</Text>
    </View>
  );
}

function Note({ color, icon, text }: { color: string; icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: color + '14', borderColor: color, borderWidth: 1, borderRadius: theme.radius.md, padding: theme.spacing.md }}>
      <Ionicons name={icon} size={16} color={color} />
      <Text role="label" color={color} style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

function totalVerdicts(counts: PromiseOutcomeScore['verdict_counts']): number {
  return counts.delivered + counts.partly_delivered + counts.not_delivered + counts.not_sure;
}

function VerdictBar({ label, count, total, color, responsesLabel }: { label: string; count: number; total: number; color: string; responsesLabel: string }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text role="label" color={theme.text}>{label}</Text>
        <Text role="label" color={theme.textMuted}>{`${count} ${responsesLabel}`}</Text>
      </View>
      <View style={{ height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.slate[100], overflow: 'hidden' }}>
        <View style={{ width: `${percent}%`, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );
}