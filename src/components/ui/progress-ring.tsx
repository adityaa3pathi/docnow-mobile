import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  /** 0…1 */
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  track: string;
  children?: ReactNode;
}

/** Circular progress, filling clockwise from 12 o'clock, with content centred inside. */
export function ProgressRing({ progress, size = 168, stroke = 10, color, track, children }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centre}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { position: 'absolute' },
  centre: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
