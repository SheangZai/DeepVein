import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { STRATA } from '@/theme';

// Wavy top edges for each band, on a 100×100 stretched grid. The first band
// starts flat at the top; each later band begins a little lower.
const BANDS = [
  { y: 0, d: 'M0 0H100V100H0Z' },
  { y: 10, d: 'M0 12 C18 8 30 15 50 11 S82 7 100 13 V100 H0Z' },
  { y: 24, d: 'M0 25 C15 29 35 21 55 26 S85 30 100 24 V100 H0Z' },
  { y: 42, d: 'M0 44 C22 40 40 47 60 42 S88 39 100 45 V100 H0Z' },
  { y: 62, d: 'M0 63 C20 67 38 59 58 64 S86 68 100 61 V100 H0Z' },
  { y: 80, d: 'M0 82 C25 78 45 85 65 80 S90 78 100 83 V100 H0Z' },
] as const;

/**
 * Layered-earth backdrop. Sits behind screen content and stays put while it scrolls.
 * `dim` darkens it so foreground cards keep their contrast.
 */
export function Strata({ dim = 0.35 }: { dim?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {BANDS.map((b, i) => (
          <Path key={b.y} d={b.d} fill={STRATA[i]} />
        ))}
        {BANDS.slice(1).map((b) => (
          <Path key={`edge${b.y}`} d={b.d.split(' V')[0]} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(10,6,4,${dim})` }]} />
    </View>
  );
}
