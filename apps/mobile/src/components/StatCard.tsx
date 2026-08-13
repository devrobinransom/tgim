import { View } from 'react-native';
import { theme } from '../theme';
import { Text } from './typography';

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
      <Text role="h1" color={accent ?? theme.text}>{value}</Text>
      <Text role="small" color={theme.textMuted} style={{ marginTop: theme.spacing.xs }}>
        {label}
      </Text>
    </View>
  );
}
