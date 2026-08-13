import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useActiveArea } from '../../src/area';
import { useI18n } from '../../src/i18n';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { ConnectionBadge } from '../../src/components/ConnectionBadge';
import { CategoryShortcuts, EmptyState, IssueCard, MapPreview, Screen, SectionHeader, TopBar } from '../../src/components/ProductPrimitives';
import { INTEREST_CATEGORIES } from '../../src/config';
import { api } from '../../src/api';
import { useFetch } from '../../src/hooks/useFetch';
import { theme } from '../../src/theme';

const SUPPORTED_CATEGORIES = new Set(INTEREST_CATEGORIES.map((c) => c.key));
const FALLBACK_CATEGORY = 'roads';

function exposedCategory(category: string): string {
  return SUPPORTED_CATEGORIES.has(category) ? category : FALLBACK_CATEGORY;
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { areaId, areaName } = useActiveArea();

  const fetchNearYou = useCallback(() => api.issues.list({ areaId }), [areaId]);
  const { data: nearYou, loading } = useFetch(fetchNearYou);

  const { areaSummary, snapshotLoading } = useAreaSnapshot(areaId);

  const list = useMemo(() => nearYou ?? [], [nearYou]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of list) {
      const key = exposedCategory(issue.category);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [list]);

  const topMaybe = [...list].slice(0, 3);

  return (
    <Screen>
      <TopBar
        title={(
          <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>
            TG<Text style={{ color: theme.accent }}>•</Text>M
          </Text>
        )}
        subtitle={areaName}
        right={<ConnectionBadge />}
      />

      {/* Locality-first hero: short blurred map of what's near you. */}
      <SectionHeader title={t('whatsHappeningNearYou')} right={<Badge label={areaName} color={theme.accent} />} />
      <MapPreview issues={list} height={180} selectedAreaName={areaName} />

      {/* Category shortcuts let the user jump into Explore filtered by topic. */}
      <SectionHeader title={t('browseByCategory')} />
      <CategoryShortcuts
        categories={INTEREST_CATEGORIES}
        selected={null}
        allowClear={false}
        onSelect={(key) => router.push({ pathname: '/(tabs)/explore', params: key ? { category: key } : {} })}
      />

      {/* Area snapshot */}
      <SectionHeader title={t('areaSnapshot')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <SnapshotPill label={snapshotLoading ? '—' : String(areaSummary?.report_count ?? 0)} value={t('nearYou')} />
        <SnapshotPill label={String(categoryCounts.size)} value="categories" />
        <SnapshotPill label={String(topMaybe.length)} value={t('inFocus')} />
      </View>

      {/* Near-you feed */}
      <SectionHeader title={t('reportsNearYou')} subtitle={`${list.length} ${areaName}`} />
      {!loading && list.length === 0 && (
        <EmptyState
          icon="megaphone"
          title={t('nothingReportedNearYou')}
          body={t('beFirstToReport')}
          action={<Button label={t('reportFirstProblem')} onPress={() => router.push('/(tabs)/report')} />}
        />
      )}
      {list.length > 0 && topMaybe.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          locality={areaName}
          onPress={() => router.push(`/issue/${issue.id}`)}
        />
      ))}
      {list.length > 3 && (
        <Button label={t('openFullMap')} variant="secondary" onPress={() => router.push('/(tabs)/explore')} />
      )}
    </Screen>
  );
}

function SnapshotPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 90, backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.md, gap: 2 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text }}>{label}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11 }}>{value}</Text>
    </View>
  );
}

function useAreaSnapshot(areaId: string) {
  const fetchSummary = useCallback(() => {
    if (!areaId) return Promise.resolve(null);
    return api.aggregates.area(areaId).catch(() => null);
  }, [areaId]);
  const { data: areaSummary, loading: snapshotLoading } = useFetch(fetchSummary);
  return { areaSummary, snapshotLoading };
}