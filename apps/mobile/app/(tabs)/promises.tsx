import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { PartyPromise } from '@tgim/shared';
import { useActiveArea } from '../../src/area';
import { useI18n, MessageKey } from '../../src/i18n';
import { Badge } from '../../src/components/Badge';
import { ConnectionBadge } from '../../src/components/ConnectionBadge';
import { EmptyState, Screen, SectionHeader, TopBar } from '../../src/components/ProductPrimitives';
import { Text } from '../../src/components/typography';
import { Button } from '../../src/components/Button';
import { api } from '../../src/api';
import { useFetch } from '../../src/hooks/useFetch';
import { theme } from '../../src/theme';

export default function PromisesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { areaId, areaName } = useActiveArea();
  const fetchManifesto = useCallback(() => api.manifesto.get(areaId).catch(() => null), [areaId]);
  const { data: manifesto } = useFetch(fetchManifesto);
  const fetchAdopted = useCallback(() => api.party.listPromises().catch(() => []), []);
  const { data: adopted } = useFetch(fetchAdopted);

  const priorities = useMemo(() => manifesto?.promises ?? [], [manifesto]);
  const commitments = useMemo(() => adopted ?? [], [adopted]);

  const byStatus = useMemo(() => {
    const order: string[] = ['on_track', 'delayed', 'needs_update', 'completed', 'draft'];
    return order
      .map((status) => ({ status, items: commitments.filter((p) => p.status === status) }))
      .filter((group) => group.items.length > 0);
  }, [commitments]);

  const statusKey = (status: string): MessageKey => {
    switch (status) {
      case 'on_track':
        return 'onTrack';
      case 'delayed':
        return 'delayed';
      case 'completed':
        return 'completed';
      case 'needs_update':
        return 'needsUpdate';
      default:
        return 'draft';
    }
  };

  return (
    <Screen>
      <TopBar title={t('promises')} subtitle={t('promisesSubtitle')} right={<ConnectionBadge />} />

      {/* Local priorities v. delivery commitments */}
      <SectionHeader title={t('localPriorities')} subtitle={areaName} />
      {priorities.length === 0 ? (
        <EmptyState icon="document-text" title={t('noManifestoYetTitle')} body={t('noManifestoYetBody')} />
      ) : (
        priorities.map((promise) => (
          <View key={promise.id} style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            <Badge label={promise.time_horizon} color={theme.accent} />
            <Text role="h3" color={theme.text}>{promise.title}</Text>
            <Text role="body" color={theme.textMuted}>{promise.description}</Text>
            {promise.target_metric ? (
              <Text role="label" color={theme.text}>{`${t('target')}: ${promise.target_metric}`}</Text>
            ) : null}
          </View>
        ))
      )}

      <SectionHeader title={t('adoptedCommitments')} subtitle={areaName} />
      {commitments.length === 0 ? (
        <EmptyState icon="checkmark-done-circle" title={t('noAdoptedYet')} body={t('noAdoptedYetBody')} />
      ) : (
        byStatus.map((group) => (
          <View key={group.status} style={{ gap: theme.spacing.md }}>
            <Text role="label" color={group.status === 'delayed' ? theme.palette.danger : theme.text}>
              {t(statusKey(group.status))}
            </Text>
            {group.items.map((promise) => (
              <PromiseCard key={promise.id} promise={promise} onPress={() => router.push(`/promise/${promise.id}`)} />
            ))}
          </View>
        ))
      )}

      <Button
        label={t('viewDelivery')}
        variant="secondary"
        onPress={() => router.push('/(tabs)/manifesto')}
      />
    </Screen>
  );
}

function PromiseCard({ promise, onPress }: { promise: PartyPromise; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: theme.spacing.lg,
        gap: theme.spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm }}>
        <Badge label={promise.status.replace(/_/g, ' ')} color={statusColor(promise.status)} />
        <Text role="caption" color={theme.textMuted}>{promise.timeline ? new Date(promise.timeline).toLocaleDateString() : ''}</Text>
      </View>
      <Text role="h3" color={theme.text}>{promise.adopted_title}</Text>
      <Text role="body" numberOfLines={3} color={theme.textMuted}>{promise.adopted_description}</Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' }}>
        <Ionicons name="trail-sign" size={16} color={theme.accent} />
        <Text role="label" color={theme.accent}>{t('viewDelivery')}</Text>
      </View>
    </View>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
    case 'on_track':
      return theme.palette.success;
    case 'delayed':
      return theme.palette.danger;
    case 'needs_update':
    case 'at_risk':
      return theme.palette.warning;
    default:
      return theme.slate[500];
  }
}