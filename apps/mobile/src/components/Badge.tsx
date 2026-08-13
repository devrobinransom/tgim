import { View } from 'react-native';
import { theme } from '../theme';
import { Text } from './typography';

/** Pill badge (the .glow-badge primitive). Pass a tint color; text/bg derive from it. */
export function Badge({
  label,
  color = theme.accent,
  icon,
}: {
  label: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        alignSelf: 'flex-start',
        backgroundColor: color + '1A', // ~10% tint
        borderColor: color + '40',
        borderWidth: 1,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
      }}
    >
      {icon}
      <Text role="small" color={color}>{label}</Text>
    </View>
  );
}
