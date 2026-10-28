import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TIERS, type TierId } from '@/game/tiers';
import { C, F, R, S } from '@/theme';

import { Gem } from './gem';
import { Icon, type IconName } from './icons';
import { Strata } from './strata';

export function Screen({
  children,
  scroll = true,
  style,
  strata = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  strata?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {strata && <Strata />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, style]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

/** Small uppercase overline, e.g. "DAILY DIG #12". */
export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

/** A rock slab: lit top edge, dark bottom lip. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Input({ style, ...props }: TextInputProps) {
  return <TextInput placeholderTextColor={C.faint} style={[styles.input, style]} {...props} />;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  const raised = variant === 'primary' || variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        raised && { borderBottomColor: v.edge, borderBottomWidth: pressed ? 1 : 4 },
        raised && pressed && styles.pushed,
        (disabled || loading) && styles.disabled,
        !raised && pressed && styles.dimmed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Icon name={icon} size={19} color={v.fg} strokeWidth={2.4} />}
          <Text style={[styles.buttonText, { color: v.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string; edge: string }> = {
  primary: { bg: C.accent, fg: C.accentText, border: C.accent, edge: C.accentEdge },
  secondary: { bg: C.surfaceRaised, fg: C.text, border: C.border, edge: C.edge },
  ghost: { bg: 'transparent', fg: C.muted, border: 'transparent', edge: 'transparent' },
  danger: { bg: 'transparent', fg: C.danger, border: C.danger, edge: C.danger },
};

export function TierChip({ tier, compact }: { tier: TierId; compact?: boolean }) {
  const t = TIERS[tier];
  return (
    <View style={[styles.chip, { borderColor: t.color, backgroundColor: `${t.color}1f` }]}>
      <Gem tier={tier} size={16} />
      <Text style={[styles.chipText, { color: t.color }]}>{compact ? `+${t.points}` : `${t.name} · +${t.points}`}</Text>
    </View>
  );
}

/** Rounded square with a tinted background holding an icon. */
export function IconBadge({ name, color = C.accent, size = 40 }: { name: IconName; color?: string; size?: number }) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: `${color}22`, borderColor: `${color}55` },
      ]}>
      <Icon name={name} size={size * 0.5} color={color} strokeWidth={2.2} />
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Center({ children }: { children: ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: S.lg, gap: S.md, paddingBottom: S.xxl, maxWidth: 640, width: '100%', alignSelf: 'center' },
  fill: { flex: 1 },
  title: { color: C.text, fontSize: 30, fontFamily: F.display, letterSpacing: 0.5 },
  heading: { color: C.text, fontSize: 19, fontFamily: F.bold },
  body: { color: C.text, fontSize: 16, lineHeight: 23, fontFamily: F.regular },
  muted: { color: C.muted, fontSize: 14, lineHeight: 20, fontFamily: F.regular },
  label: { color: C.muted, fontSize: 12, letterSpacing: 1.6, fontFamily: F.bold, textTransform: 'uppercase' },
  card: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderTopColor: C.highlight,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderBottomColor: C.edge,
    borderRadius: R.lg,
    padding: S.lg,
    gap: S.sm,
  },
  input: {
    backgroundColor: C.edge,
    borderColor: C.border,
    borderWidth: 2,
    borderRadius: R.md,
    color: C.text,
    fontSize: 18,
    fontFamily: F.semi,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  button: {
    minHeight: 54,
    borderRadius: R.md,
    borderWidth: 1,
    paddingHorizontal: S.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  buttonText: { fontSize: 17, fontFamily: F.heavy, letterSpacing: 0.3 },
  disabled: { opacity: 0.45 },
  pushed: { marginTop: 3 },
  dimmed: { opacity: 0.7 },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: R.pill,
    paddingLeft: 5,
    paddingRight: S.sm + 2,
    paddingVertical: 3,
  },
  chipText: { fontSize: 13, fontFamily: F.bold },
  badge: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.md, padding: S.xl },
});
