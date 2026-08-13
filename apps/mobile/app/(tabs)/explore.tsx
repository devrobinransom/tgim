import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActiveArea } from '../../src/area';
import { useI18n } from '../../src/i18n';
import { Button } from '../../src/components/Button';
import { CategoryShortcuts, EmptyState, IssueCard, MapPreview, Screen, TopBar } from '../../src/components/ProductPrimitives';
import { Text } from '../../src/components/typography';
import { fontScale, theme } from '../../src/theme';
import { INTEREST_CATEGORIES } from '../../src/config';
import { api } from '../../src/api';
import { useFetch } from '../../src/hooks/useFetch';

export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { category: initialCategory } = useLocalSearchParams<{ category?: string }>();
  const { areaName } = useActiveArea();
  const [category, setCategory] = useState<string | null>(
    initialCategory && INTEREST_CATEGORIES.some((c) => c.key === initialCategory) ? initialCategory : null,
  );
  const [view, setView] = useState<'map' | 'list'>('map');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAll = useCallback(() => api.issues.list(), []);
  const { data, reload } = useFetch(fetchAll);

  const all = useMemo(() => {
    const list = data ?? [];
    if (!category) return list;
    return list.filter((issue) => issue.category === category);
  }, [data, category]);

  const matchesSearch = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (issue) =>
        issue.description.toLowerCase().includes(term) ||
        (issue.pincode_code ?? '').includes(term) ||
        issue.category.includes(term),
    );
  }, [all, searchTerm]);

  const visible = matchesSearch;

  return (
    <Screen>
      <TopBar
        title={t('explore')}
        subtitle={t('exploreSubtitle')}
        right={<View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <ViewToggle active={view === 'map'} icon="map" label={t('mapView')} onPress={() => setView('map')} />
          <ViewToggle active={view === 'list'} icon="list" label={t('listView')} onPress={() => setView('list')} />
        </View>}
      />

      {/* Search + filter */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.card,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.border,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder={t('searchLocality')}
          placeholderTextColor={theme.slate[400]}
          style={{ flex: 1, color: theme.text, fontSize: fontScale.body.fontSize }}
        />
      </View>

      <CategoryShortcuts
        categories={INTEREST_CATEGORIES}
        selected={category}
        allowClear
        onSelect={(key) => setCategory(key)}
      />

      {view === 'map' ? (
        <>
          <MapPreview issues={visible} height={240} selectedAreaName={areaName} onSelect={(id) => router.push(`/issue/${id}`)} />
          <Text role="caption" color={theme.textMuted} center>{t('tapMarkerHint')}</Text>
        </>
      ) : (
        <Text role="small" color={theme.textMuted}>{`${visible.length} ${t('issuesInArea')}`}</Text>
      )}

      {visible.length === 0 && (
        <EmptyState icon="compass" title={t('noResultsFound')} body={`${areaName} · ${category ?? t('allCategories')}`} />
      )}

      {view === 'list' &&
        visible.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            locality={areaName}
            onPress={() => router.push(`/issue/${issue.id}`)}
            actionLabel={t('viewOnMap')}
          />
        ))}

      {data === null && (
        <Button label={t('retry')} variant="secondary" onPress={reload} />
      )}
    </Screen>
  );
}

function ViewToggle({ active, icon, label, onPress }: { active: boolean; icon: 'map' | 'list'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.accent + '14' : theme.card,
        borderWidth: 1,
        borderColor: active ? theme.accent : theme.border,
      }}
    >
      <Ionicons name={icon} size={15} color={active ? theme.accent : theme.textMuted} />
      <Text role="small" color={active ? theme.accent : theme.textMuted}>{label}</Text>
    </Pressable>
  );
}