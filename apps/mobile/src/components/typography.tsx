import type { ReactNode } from 'react';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { fontScale, type FontRole } from '../theme';

/**
 * Token-backed text primitive. Render all user-facing copy through this
 * component with a `role`; never hardcode fontSize/fontWeight in screens.
 * When `role` is omitted (nested text) the parent's typography is inherited.
 */
export interface TypographyTextProps {
  role?: FontRole;
  color?: string;
  center?: boolean;
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export function Text({
  role,
  color,
  center,
  style,
  ...rest
}: TypographyTextProps) {
  const base = role ? fontScale[role] : undefined;
  return (
    <RNText
      {...rest}
      style={[base, color ? { color } : undefined, center ? { textAlign: 'center' } : undefined, style]}
    />
  );
}
