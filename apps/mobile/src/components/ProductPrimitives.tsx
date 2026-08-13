import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import type { PublicIssue, IssueCategory, PromiseStatus } from '@tgim/shared';
import { tokens } from '@tgim/shared';
import { theme } from '../theme';
import { useI18n } from '../i18n';
import { Badge } from './Badge';
import { Sparkline } from './Sparkline';
import { Text } from './typography';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';

const BBOX = { minLat: 19.0, maxLat: 19.3, minLng: 72.8, maxLng: 72.98 };
const MAP_W = 320;
const MAP_H = 200;

function project(lat: number, lng: number) {
  const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * MAP_W;
  const y = MAP_H - ((lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat)) * MAP_H;
  return { x: Math.max(8, Math.min(MAP_W - 8, x)), y: Math.max(8, Math.min(MAP_H - 8, y)) };
}

function trendFor(severity: PublicIssue['severity'], id: string): number[] {
  const weight = tokens.severityToScale[severity].step;
  const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Array.from({ length: 6 }, (_, i) => weight + ((seed + i * (weight + 1)) % 5));
}

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + theme.spacing.md, gap: theme.spacing.lg }}
    >
      {children}
      <View style={{ height: insets.bottom + theme.spacing.sm }} />
    </ScrollView>
  );
}

export function TopBar({ title, subtitle, right }: { title: ReactNode; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md }}>
      <View style={{ flex: 1 }}>
        {typeof title === 'string' ? (
          <Text role="h1" color={theme.text}>{title}</Text>
        ) : (
          title
        )}
        {subtitle && <Text role="label" color={theme.textMuted} style={{ marginTop: theme.spacing.xs }}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function SearchSurface({ label }: { label: string }) {
  return (
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
        paddingVertical: theme.spacing.md,
      }}
    >
      <Ionicons name="search" size={18} color={theme.textMuted} />
      <Text role="label" color={theme.textMuted}>{label}</Text>
    </View>
  );
}

export function MapPreview({
  issues,
  height = 200,
  onSelect,
  selectedAreaName,
}: {
  issues: PublicIssue[];
  height?: number;
  onSelect?: (issueId: string) => void;
  selectedAreaName?: string;
}) {
  const { t } = useI18n();
  const mapStyle = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
  const shape = (processStyle: string | undefined) => ({ type: 'FeatureCollection', features: issues.map(issue => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [issue.public_longitude, issue.public_latitude] }, properties: { id: issue.id, category: issue.category } })) }) as any;
  const accessibility = `${t('mapA11ySafe')}: ${issues.length} ${t('reports')}`;
  if (mapStyle) {
    return (
      <View accessibilityLabel={accessibility} style={{ height, borderRadius: theme.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
        <Map style={{ flex: 1 }} mapStyle={mapStyle}>
          <Camera initialViewState={{ center: [72.86, 19.12], zoom: 10.5 }} />
          <GeoJSONSource
            id="issues"
            data={shape(mapStyle)}
            onPress={onSelect ? (event) => {
              const feature = event.nativeEvent.features?.[0] as { properties?: { id?: string } } | undefined;
              if (feature?.properties?.id) onSelect(feature.properties.id);
            } : undefined}
          >
            <Layer
              id="issue-points"
              type="circle"
              paint={{ 'circle-radius': 8, 'circle-color': theme.accent, 'circle-opacity': 0.8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }}
            />
          </GeoJSONSource>
        </Map>
        <View style={{ position: 'absolute', top: theme.spacing.sm, left: theme.spacing.sm }}><Badge label={selectedAreaName ? `${issues.length} ${t('reports')} · ${selectedAreaName}` : `${issues.length} ${t('reports')}`} color={theme.accent} /></View>
      </View>
    );
  }
  return (
    <View
      accessibilityLabel={accessibility}
      style={{
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={theme.slate[100]} />
        {issues.map((issue) => {
          const { x, y } = project(issue.public_latitude, issue.public_longitude);
          const color = tokens.categoryColor[issue.category as IssueCategory] ?? theme.accent;
          return <Circle key={issue.id} cx={x} cy={y} r={7} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />;
        })}
      </Svg>
      <View style={{ position: 'absolute', top: theme.spacing.sm, left: theme.spacing.sm }}>
        <Badge label={`${issues.length} ${t('reports')}`} color={theme.accent} />
      </View>
      <View style={{ position: 'absolute', right: theme.spacing.sm, bottom: theme.spacing.sm }}>
        <Badge label={t('blurredPublicLocations')} color={theme.slate[500]} />
      </View>
    </View>
  );
}

/** Plain-language issue card for the Near-you feed. */
export function IssueCard({
  issue,
  locality,
  onPress,
  actionLabel,
}: {
  issue: PublicIssue;
  locality?: string;
  onPress: () => void;
  actionLabel?: string;
}) {
  const color = tokens.categoryColor[issue.category as IssueCategory] ?? theme.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${issue.category}: ${issue.description}`}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        backgroundColor: theme.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: theme.spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Badge label={issue.category} color={color} />
          {issue.pincode_code ? <Text role="caption" color={theme.textMuted}>{issue.pincode_code}</Text> : null}
        </View>
        <Text role="bodyStrong" numberOfLines={2} color={theme.text}>
          {issue.description}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          {locality ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Ionicons name="location" size={13} color={theme.textMuted} />
              <Text role="small" color={theme.textMuted}>{locality}</Text>
            </View>
          ) : null}
          <Text role="small" color={theme.textMuted}>{issue.status.replace(/_/g, ' ')}</Text>
        </View>
        {actionLabel ? <Text role="label" color={color}>{actionLabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.slate[400]} />
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.xl, gap: theme.spacing.md, alignItems: 'center' }}>
      <Ionicons name={icon} size={32} color={theme.accent} />
      <Text role="h3" color={theme.text} center>{title}</Text>
      <Text role="label" color={theme.textMuted} center>{body}</Text>
      {action}
    </View>
  );
}

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text role="h2" color={theme.text}>{title}</Text>
        {subtitle ? <Text role="label" color={theme.textMuted} style={{ marginTop: theme.spacing.xs }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function CategoryShortcuts({
  categories,
  selected,
  onSelect,
  allowClear,
}: {
  categories: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[];
  selected?: string | null;
  onSelect: (key: string | null) => void;
  allowClear?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {categories.map((item) => {
        const active = selected === item.key;
        const color = tokens.categoryColor[item.key as IssueCategory] ?? theme.accent;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(active && allowClear ? null : item.key)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: active ? color : theme.border,
              backgroundColor: active ? color + '14' : theme.card,
            }}
          >
            <Ionicons name={item.icon} size={16} color={active ? color : theme.textMuted} />
            <Text role="label" color={active ? color : theme.text}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type MilestoneJourneyItem = {
  label: string;
  value?: string;
  state: 'complete' | 'current' | 'pending' | 'disputed';
  date?: string;
  evidenceUrl?: string;
};

/** Ordered delivery journey. States are always shown with text, never color-only. */
export function MilestoneJourney({
  items,
  emptyTitle,
  emptyBody,
}: {
  items: MilestoneJourneyItem[];
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const { t } = useI18n();
  if (items.length === 0) {
    return <EmptyState icon="trail-sign" title={emptyTitle ?? t('noMilestonesTitle')} body={emptyBody ?? t('noMilestonesBody')} />;
  }
  const iconFor = (state: MilestoneJourneyItem['state']) =>
    state === 'complete' ? 'checkmark-circle' : state === 'current' ? 'radio-button-on' : state === 'disputed' ? 'alert-circle' : 'radio-button-off';
  const colorFor = (state: MilestoneJourneyItem['state']) =>
    state === 'disputed' ? theme.palette.danger : state === 'complete' ? theme.palette.success : state === 'current' ? theme.accent : theme.slate[400];
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 0 }}>
      {items.map((item, index) => (
        <View key={`${item.label}-${index}`} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Ionicons name={iconFor(item.state)} size={20} color={colorFor(item.state)} />
            {index < items.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: item.state === 'complete' ? theme.palette.success : theme.slate[200] }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: theme.spacing.sm }}>
              <Text role="bodyStrong" color={theme.text}>{item.label}</Text>
              {item.date ? <Text role="caption" color={theme.textMuted}>{item.date}</Text> : null}
            </View>
            {item.value ? <Text role="label" color={theme.textMuted} style={{ marginTop: theme.spacing.xs }}>{item.value}</Text> : null}
            {item.evidenceUrl ? (
              <Text role="label" color={theme.accent} style={{ marginTop: theme.spacing.xs }}>{`${String.fromCharCode(0x1f517)} ${t('evidence')}`}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function QueueCard({ issue, onPress }: { issue: PublicIssue; onPress: () => void }) {
  const color = tokens.categoryColor[issue.category as IssueCategory] ?? theme.accent;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        backgroundColor: theme.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: theme.spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: theme.spacing.sm }}>
        <Badge label={issue.category} color={color} />
        <Text role="bodyStrong" numberOfLines={2} color={theme.text}>
          {issue.description}
        </Text>
        <Text role="small" color={theme.textMuted}>
          {issue.privacy} location / {issue.status}
        </Text>
      </View>
      <Sparkline data={trendFor(issue.severity, issue.id)} color={tokens.severityToScale[issue.severity].color} />
      <Ionicons name="chevron-forward" size={18} color={theme.slate[400]} />
    </Pressable>
  );
}

export function StatusChip({ status }: { status: PromiseStatus | string }) {
  const color = status in tokens.statusColor ? tokens.statusColor[status as PromiseStatus] : theme.textMuted;
  return <Badge label={status.replace(/_/g, ' ')} color={color} />;
}

export function NativeTimeline({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: theme.spacing.md }}>
      {items.map((item) => (
        <View key={`${item.label}-${item.value}`} style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
          <View style={{ width: 8, height: 8, borderRadius: theme.radius.pill, backgroundColor: theme.accent, marginTop: theme.spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text role="small" color={theme.textMuted}>{item.value}</Text>
            <Text role="bodyStrong" color={theme.text}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
