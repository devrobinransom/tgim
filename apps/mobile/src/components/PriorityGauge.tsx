import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../theme';

/** Circular priority-score gauge (the 86/100 ring from Mock 1). 0–100. */
export function PriorityGauge({ score, size = 96 }: { score: number; size?: number }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(score, 0), 100);
  const dash = (clamped / 100) * circumference;

  // Color shifts with severity of the score.
  const color =
    clamped >= 75 ? theme.palette.danger : clamped >= 50 ? '#f97316' : theme.palette.success;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.slate[200]}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text }}>{Math.round(clamped)}</Text>
      <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>/ 100</Text>
    </View>
  );
}
