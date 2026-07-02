import { Text, View } from 'react-native';
import { theme } from '../theme';

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
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: color + '1A', // ~10% tint
        borderColor: color + '40',
        borderWidth: 1,
        borderRadius: theme.radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      {icon}
      <Text style={{ color, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}
