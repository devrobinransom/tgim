import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import type { PublicIssue, IssueCategory, PromiseStatus } from '@tgim/shared';
import { tokens } from '@tgim/shared';
import { theme } from '../theme';
import { Badge } from './Badge';
import { Sparkline } from './Sparkline';
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
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + 12, gap: 16 }}
    >
      {children}
      <View style={{ height: insets.bottom + 8 }} />
    </ScrollView>
  );
}

export function TopBar({ title, subtitle, right }: { title: ReactNode; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        {typeof title === 'string' ? (
          <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>{title}</Text>
        ) : (
          title
        )}
        {subtitle && <Text style={{ color: theme.textMuted, marginTop: 2 }}>{subtitle}</Text>}
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
        gap: 8,
        backgroundColor: theme.card,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Ionicons name="search" size={18} color={theme.textMuted} />
      <Text style={{ color: theme.textMuted }}>{label}</Text>
    </View>
  );
}

export function MapPreview({ issues }: { issues: PublicIssue[] }) {
  const mapStyle = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
  if (mapStyle) {
    const shape = { type: 'FeatureCollection', features: issues.map(issue => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [issue.public_longitude, issue.public_latitude] }, properties: { category: issue.category } })) } as any;
    return (
      <View accessibilityLabel={`Privacy-safe map showing ${issues.length} blurred public report locations`} style={{ height: MAP_H, borderRadius: theme.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
        <Map style={{ flex: 1 }} mapStyle={mapStyle}>
          <Camera initialViewState={{ center: [72.86, 19.12], zoom: 10.5 }} />
          <GeoJSONSource id="issues" data={shape}><Layer id="issue-points" type="circle" paint={{ 'circle-radius': 8, 'circle-color': theme.accent, 'circle-opacity': 0.8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }} /></GeoJSONSource>
        </Map>
        <View style={{ position: 'absolute', top: 8, left: 8 }}><Badge label={`${issues.length} blurred reports`} color={theme.accent} /></View>
      </View>
    );
  }
  return (
    <View
      accessibilityLabel={`Privacy-safe map showing ${issues.length} blurred public report locations`}
      style={{
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Svg width="100%" height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={theme.slate[100]} />
        {issues.map((issue) => {
          const { x, y } = project(issue.public_latitude, issue.public_longitude);
          const color = tokens.categoryColor[issue.category as IssueCategory] ?? theme.accent;
          return <Circle key={issue.id} cx={x} cy={y} r={7} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />;
        })}
      </Svg>
      <View style={{ position: 'absolute', top: 8, left: 8 }}>
        <Badge label={`${issues.length} reports`} color={theme.accent} />
      </View>
      <View style={{ position: 'absolute', right: 8, bottom: 8 }}>
        <Badge label="blurred public locations" color={theme.slate[500]} />
      </View>
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
        gap: 12,
        backgroundColor: theme.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: theme.spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Badge label={issue.category} color={color} />
        <Text numberOfLines={2} style={{ color: theme.text, fontWeight: '600' }}>
          {issue.description}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
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
    <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 12 }}>
      {items.map((item) => (
        <View key={`${item.label}-${item.value}`} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent, marginTop: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '800' }}>{item.value}</Text>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
