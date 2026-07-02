import { ActivityIndicator, Pressable, Text } from 'react-native';
import { theme } from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}

/** Primary orange CTA / secondary outline button (the .primary primitive). */
export function Button({ label, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: isPrimary ? theme.accent : 'transparent',
        borderColor: theme.accent,
        borderWidth: isPrimary ? 0 : 1.5,
        borderRadius: theme.radius.md,
        paddingVertical: 14,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        shadowColor: theme.accent,
        shadowOpacity: isPrimary ? 0.35 : 0,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      })}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : theme.accent} />
      ) : (
        <Text style={{ color: isPrimary ? '#fff' : theme.accent, fontWeight: '700', fontSize: 15 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
