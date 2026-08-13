import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { tokens } from '@tgim/shared';
import type { IssueCategory } from '@tgim/shared';
import type { IssueDetail } from '@tgim/api-client';
import { useI18n, MessageKey } from '../../src/i18n';
import { api } from '../../src/api';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/typography';
import { EmptyState, MilestoneJourney } from '../../src/components/ProductPrimitives';
import { useFetch } from '../../src/hooks/useFetch';
import { theme } from '../../src/theme';

export default function IssueDetailScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const fetchIssue = useCallback(() => api.issues.get(String(id)), [id]);
  const { data: issue, loading, reload } = useFetch(fetchIssue);

  const support = async () => {
    if (!id) return;
    setMessage(null);
    try {
      await api.issues.support(String(id));
      reload();
      setMessage(t('confirmRecorded'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('supportFailed'));
    }
  };

  const color = issue ? tokens.categoryColor[issue.category as IssueCategory] ?? theme.accent : theme.accent;
  const lifecycle = useMemo(() => buildLifecycle(issue, t), [issue, t]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      {loading && <Text role="body" color={theme.textMuted}>{t('loadingIssue')}</Text>}
      {issue && (
        <>
          {/* Status + metadata first, so the user immediately sees where it stands. */}
          <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Badge label={issue.category} color={color} />
              {issue.status === 'duplicate' && <Badge label={t('disputedState')} color={theme.palette.warning} />}
            </View>
            <Text role="h1" color={theme.text}>{issue.description}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons name="location" size={15} color={theme.textMuted} />
              <Text role="label" color={theme.textMuted}>
                {issue.pincode_code ? `${issue.pincode_code} · ` : ''}
                {t('pvt')} {String(issue.public_latitude).slice(0, 6)}, {String(issue.public_longitude).slice(0, 6)}
              </Text>
            </View>
          </View>

          {/* Lifecycle first: the single most important thing on the screen. */}
          <MilestoneJourney items={lifecycle} />

          {/* Confirm still happening */}
          <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Text role="h3" color={theme.text}>{t('confirmStillHappening')}</Text>
            <Text role="body" color={theme.textMuted}>{t('confirmStillHappeningBody')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons name="people" size={16} color={theme.accent} />
              <Text role="bodyStrong" color={theme.text}>{`${issue.supports} ${t('supporters')}`}</Text>
            </View>
            <Button label={t('confirmStillHappening')} onPress={support} />
            {message && <Text role="body" color={theme.palette.success}>{message}</Text>}
          </View>

          {/* Evidence */}
          {issue.media.length > 0 ? (
            <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: theme.spacing.sm }}>
              <Text role="h3" color={theme.text}>{t('viewEvidence')}</Text>
              {issue.media.map((media) => (
                <Text key={media.id} role="label" numberOfLines={1} color={theme.accent}>
                  {`${String.fromCharCode(0x1f517)} ${media.media_url}`}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
      {!loading && !issue && (
        <EmptyState icon="alert-circle" title={t('loadingIssue')} body={t('somethingWentWrong')} />
      )}
    </ScrollView>
  );
}

function buildLifecycle(
  issue: IssueDetail | null,
  t: (key: MessageKey) => string,
): { label: string; value?: string; state: 'complete' | 'current' | 'pending' | 'disputed' }[] {
  if (!issue) return [];
  const confirmed = issue.supports > 0;
  const verified = issue.status === 'clustered' || issue.status === 'resolved';
  const delivered = issue.status === 'resolved';
  const step = (label: string, done: boolean, current: boolean, value?: string) => ({
    label,
    value,
    state: (done ? 'complete' : current ? 'current' : 'pending') as 'complete' | 'current' | 'pending',
  });

  return [
    step(t('reportedStep'), true, false),
    step(t('confirmedStep'), confirmed, !confirmed, confirmed ? `${issue.supports} ${t('supporters')}` : undefined),
    step(t('verifiedStep'), verified, !verified && confirmed),
    step(t('inLocalPriorities'), delivered, !delivered && verified),
    step(t('deliveryStep'), delivered, !delivered && verified),
  ];
}