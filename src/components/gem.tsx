import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { TIERS, type TierId } from '@/game/tiers';
import type { AnswerRecord } from '@/lib/progress';

const LIGHT = 'rgba(255,255,255,0.45)';
const SHINE = 'rgba(255,255,255,0.8)';
const SHADE = 'rgba(0,0,0,0.28)';
const DEEP = 'rgba(0,0,0,0.45)';

/** Faceted shapes on a 32×32 grid, one per tier. Base color comes from TIERS. */
function shape(tier: TierId, base: string) {
  switch (tier) {
    case 'miss':
      return (
        <>
          <Path d="M6 21 9 11l8-4 8 4 2 10-6 5H11Z" fill={base} />
          <Path d="M9 11l8-4 8 4-8 4Z" fill={LIGHT} opacity={0.35} />
          <Path d="M17 15l10 6-6 5H11l6-11Z" fill={DEEP} />
        </>
      );
    case 'dirt':
      return (
        <>
          <Path d="M5 21c0-5 3-9 7-10 1-3 5-4 8-2 4 0 7 4 7 8s-3 7-7 7H11c-3 0-6-1-6-3Z" fill={base} />
          <Path d="M12 11c1-3 5-4 8-2-3 0-5 1-6 3Z" fill={LIGHT} opacity={0.5} />
          <Path d="M5 21c0 2 3 3 6 3h9c4 0 7-3 7-7-2 4-5 5-9 5H9c-2 0-3-.5-4-1Z" fill={SHADE} />
          <Circle cx={12} cy={17} r={1.3} fill={DEEP} />
          <Circle cx={19} cy={14} r={1} fill={DEEP} />
          <Circle cx={21} cy={19} r={1.2} fill={DEEP} />
        </>
      );
    case 'fools':
      return (
        <>
          <Path d="M16 5 27 10 16 15 5 10Z" fill={base} />
          <Path d="M16 5 27 10 16 15 5 10Z" fill={LIGHT} />
          <Path d="M5 10 16 15V27L5 22Z" fill={base} />
          <Path d="M27 10V22L16 27V15Z" fill={base} />
          <Path d="M27 10V22L16 27V15Z" fill={SHADE} />
          <Path d="M8 10 16 6.5 14 10Z" fill={SHINE} opacity={0.6} />
        </>
      );
    case 'copper':
      return (
        <>
          <Path d="M6 18 9 9l9-4 8 5 1 9-6 7-10-1Z" fill={base} />
          <Path d="M9 9l9-4 8 5-9 3Z" fill={LIGHT} />
          <Path d="M17 13l10 6-6 7-4-13Z" fill={SHADE} />
          <Path d="M11 10l4-2-1 3Z" fill={SHINE} opacity={0.7} />
        </>
      );
    case 'emerald':
      return (
        <>
          <Path d="M11 3h10l6 6v14l-6 6H11l-6-6V9Z" fill={base} />
          <Path d="M11 3h10l6 6h-6l-1-1h-8l-1 1H5Z" fill={LIGHT} />
          <Path d="M27 9v14l-6 6v-6l1-1V10l-1-1Z" fill={SHADE} />
          <Path d="M13 8h6l3 3v10l-3 3h-6l-3-3V11Z" fill={LIGHT} opacity={0.35} />
          <Path d="M13 9h3l-4 4v-2Z" fill={SHINE} opacity={0.7} />
        </>
      );
    case 'ruby':
      return (
        <>
          <Path d="M16 3 27 10v12l-11 7-11-7V10Z" fill={base} />
          <Path d="M16 3 27 10 16 16 5 10Z" fill={LIGHT} />
          <Path d="M27 10v12l-11 7V16Z" fill={SHADE} />
          <Path d="M16 16v13l-11-7 11-6Z" fill={DEEP} opacity={0.25} />
          <Path d="M10 9l6-3.5L13 10Z" fill={SHINE} opacity={0.7} />
        </>
      );
    case 'diamond':
      return (
        <>
          <Path d="M9 5h14l6 8H3Z" fill={base} />
          <Path d="M9 5h14l6 8H3Z" fill={LIGHT} />
          <Path d="M3 13h26L16 29Z" fill={base} />
          <Path d="M16 13h13L16 29Z" fill={SHADE} />
          <Path d="M11 13l5 16 5-16" fill="none" stroke={SHADE} strokeWidth={0.8} />
          <Path d="M9 5l2 8 5-8 5 8 2-8" fill="none" stroke={SHINE} strokeWidth={0.8} opacity={0.7} />
          <Path d="M10 6.5h4l-3 4Z" fill={SHINE} />
        </>
      );
  }
}

/** A tier rendered as a faceted gem/ore. `glow` adds a soft halo for big moments. */
export function Gem({ tier, size = 24, glow }: { tier: TierId; size?: number; glow?: boolean }) {
  const color = TIERS[tier].color;
  return (
    <View style={{ width: size, height: size }}>
      {glow && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.glow,
            { backgroundColor: color, borderRadius: size, transform: [{ scale: 1.15 }] },
          ]}
        />
      )}
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {shape(tier, color)}
      </Svg>
    </View>
  );
}

/** One gem per answer, like the share grid. */
export function GemRow({ answers, size = 22, gap = 4 }: { answers: AnswerRecord[]; size?: number; gap?: number }) {
  return (
    <View style={[styles.row, { gap }]}>
      {answers.map((a, i) => (
        <Gem key={a.promptId + i} tier={a.tier} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { opacity: 0.14 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
});
