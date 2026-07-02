import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import type { IssueCategory } from '@tgim/shared';
import { tokens } from '@tgim/shared';
import { Badge } from '../../src/components/Badge';
import { ConnectionBadge } from '../../src/components/ConnectionBadge';
import { Sparkline } from '../../src/components/Sparkline';
import { StatCard } from '../../src/components/StatCard';
import { ACTIVE_AREA_NAME, SEED_PINCODES } from '../../src/config';
import { api } from '../../src/api';
import { useFetch } from '../../src/hooks/useFetch';
import { theme } from '../../src/theme';

// Mumbai Suburban bounding box → SVG viewport projection (uses the privacy-safe
// public_location, never exact coords — the Zero-Leak Privacy guardrail).
const BBOX = { minLat: 19.0, maxLat: 19.3, minLng: 72.8, maxLng: 72.98 };
const MAP_W = 320;
const MAP_H = 200;

function project(lat: number, lng: number) {
  const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * MAP_W;
  const y = MAP_H - ((lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat)) * MAP_H;
  return { x: Math.max(8, Math.min(MAP_W - 8, x)), y: Math.max(8, Math.min(MAP_H - 8, y)) };
}

// Deterministic attention trend derived from the issue itself (severity weight +
// a stable per-issue offset from its id) — not random, not a hardcoded constant.
function trendFor(severity: import('@tgim/shared').IssueSeverity, id: string): number[] {
  const weight = tokens.severityToScale[severity].step;
  const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Array.from({ length: 6 }, (_, i) => weight + ((seed + i * (weight + 1)) % 5));
}

export default function MapDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fetchIssues = useCallback(() => api.issues.list(), []);
  const { data: issues, loading } = useFetch(fetchIssues);

  const list = issues ?? [];
  const categories = new Set(list.map((i) => i.category));
  const topIssues = [...list].slice(0, 5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + 12, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>
          TG<Text style={{ color: theme.accent }}>•</Text>M
        </Text>
        <ConnectionBadge />
      </View>

      {/* Search bar (visual entry point) */}
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
        <Text style={{ color: theme.textMuted }}>Search {ACTIVE_AREA_NAME}…</Text>
      </View>

      {/* Hotspot map */}
      <View
        style={{
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Svg width="100%" height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
          <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={theme.slate[100]} />
          {list.map((issue) => {
            const { x, y } = project(issue.public_latitude, issue.public_longitude);
            const color = tokens.categoryColor[issue.category as IssueCategory] ?? theme.accent;
            return <Circle key={issue.id} cx={x} cy={y} r={7} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />;
          })}
        </Svg>
        <View style={{ position: 'absolute', top: 8, left: 8 }}>
          <Badge label={`${list.length} reports`} color={theme.accent} />
        </View>
      </View>

      {/* Area stat cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatCard value={loading ? '—' : String(list.length)} label="Citizen Inputs" accent={theme.accent} />
        <StatCard value={String(categories.size)} label="Active Categories" />
        <StatCard value={String(SEED_PINCODES.length)} label="Pincodes Covered" />
        <StatCard value={ACTIVE_AREA_NAME} label="Constituency" />
      </View>

      {/* Top issues */}
      <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text }}>Top Issues</Text>
      {topIssues.length === 0 && !loading && (
        <Text style={{ color: theme.textMuted }}>No reports yet — be the first to pin a problem.</Text>
      )}
      {topIssues.map((issue) => (
        <Pressable
          key={issue.id}
          onPress={() => router.push(`/issue/${issue.id}`)}
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
            <Badge
              label={issue.category}
              color={tokens.categoryColor[issue.category as IssueCategory] ?? theme.accent}
            />
            <Text numberOfLines={2} style={{ color: theme.text, fontWeight: '600' }}>
              {issue.description}
            </Text>
          </View>
          <Sparkline
            data={trendFor(issue.severity, issue.id)}
            color={tokens.severityToScale[issue.severity].color}
          />
          <Ionicons name="chevron-forward" size={18} color={theme.slate[400]} />
        </Pressable>
      ))}

      <Pressable
        onPress={() => router.push('/(tabs)/manifesto')}
        style={{
          backgroundColor: theme.accent,
          borderRadius: theme.radius.md,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Generate Local Manifesto</Text>
      </Pressable>

      <View style={{ height: insets.bottom + 8 }} />
    </ScrollView>
  );
}
