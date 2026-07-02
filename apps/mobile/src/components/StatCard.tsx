import { Text, View } from 'react-native';
import { theme } from '../theme';

/** Compact stat card used on the area dashboard (Mock 3 / Mock 8 bottom sheet). */
export function StatCard({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        backgroundColor: theme.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: theme.spacing.md,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: accent ?? theme.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600', marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}
