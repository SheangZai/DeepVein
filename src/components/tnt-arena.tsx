import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { getPrompt } from '@/content';
import { START_HEARTS, type TntPlayer, type TntState } from '@/game/tnt';
import { BUDDIES } from '@/game/tiers';
import { C, F, R, S } from '@/theme';

import { Icon } from './icons';
import { Strata } from './strata';

// ---------- Layout shells ----------

/** Full-screen TNT layout: scrolling table area plus an optional pinned footer. */
export function TntScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Strata dim={0.45} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Dark console panel with a spaced-out title and a dashed rule. */
export function Panel({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.panel, style]}>
      {title && (
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>{title}</Text>
          <View style={styles.rule} />
          {action && (
            <Pressable onPress={action.onPress} hitSlop={8}>
              <Text style={styles.panelAction}>{action.label}</Text>
            </Pressable>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

export function HudBox({ label, value, color = C.accent }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.hudBox}>
      <Text style={styles.hudLabel}>{label}</Text>
      <Text style={[styles.hudValue, { color }]}>{value}</Text>
    </View>
  );
}

export function HudRow({ left, middle, right }: { left: ReactNode; middle: string; right: ReactNode }) {
  return (
    <View style={styles.hudRow}>
      {left}
      <Text style={styles.hudMiddle}>{middle}</Text>
      {right}
    </View>
  );
}

export function CategoryBanner({ state }: { state: TntState }) {
  const prompt = state.promptId ? getPrompt(state.promptId) : null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerLabel}>CATEGORY {Math.max(1, state.seenPrompts.length)}</Text>
      <Text style={styles.bannerText}>{prompt?.text ?? '…'}</Text>
      <Text style={styles.bannerHint}>▼ any new answer passes the TNT ▼</Text>
    </View>
  );
}

// ---------- Table feed: answer bubbles + activity log ----------

export interface Bubble {
  text: string;
  ok: boolean;
}

export interface TableFeed {
  bubbles: Record<string, Bubble>;
  log: { id: number; text: string; tone: 'info' | 'good' | 'bad' }[];
  n: number;
}

function nameOf(s: TntState, id: string) {
  return s.players.find((p) => p.id === id)?.name ?? 'Someone';
}

function advance(feed: TableFeed, prev: TntState, next: TntState): TableFeed {
  const bubbles = { ...feed.bubbles };
  const log = [...feed.log];
  let n = feed.n;
  const add = (text: string, tone: TableFeed['log'][number]['tone'] = 'info') => log.unshift({ id: n++, text, tone });

  for (const p of next.players) if (!prev.players.some((q) => q.id === p.id)) add(`${p.name} joined`);
  if (next.phase === 'lobby') {
    for (const p of prev.players) if (!next.players.some((q) => q.id === p.id)) add(`${p.name} left`);
  }
  if (next.promptId && next.promptId !== prev.promptId) {
    for (const k of Object.keys(bubbles)) delete bubbles[k];
    add(`Category ${next.seenPrompts.length}: ${getPrompt(next.promptId).text}`);
  }
  const e = next.lastEvent;
  if (e && next.seq > prev.seq && JSON.stringify(e) !== JSON.stringify(prev.lastEvent)) {
    const who = nameOf(next, e.playerId);
    if (e.kind === 'pass') {
      bubbles[e.playerId] = { text: e.answer, ok: true };
      add(`${who} passed with ${e.answer}`, 'good');
    } else if (e.kind === 'reject') {
      bubbles[e.playerId] = { text: e.text, ok: false };
      add(e.reason === 'used' ? `${e.text} was already said` : `${who}: “${e.text}” doesn’t fit`, 'bad');
    } else if (e.kind === 'boom') {
      const out = next.players.find((p) => p.id === e.playerId)?.alive === false;
      add(out ? `BOOM! ${who} is out` : `BOOM! ${who} loses a heart`, 'bad');
    } else if (e.kind === 'left') {
      add(`${who} left`);
    }
  }
  if (next.phase === 'over' && prev.phase !== 'over') {
    add(next.winner ? `${nameOf(next, next.winner)} wins!` : 'Everyone blew up!', 'good');
  }
  return { bubbles, log: log.slice(0, 30), n };
}

/** Turns state snapshots into per-player answer bubbles and a running log. */
export function useTableFeed(state: TntState) {
  const [prev, setPrev] = useState(state);
  const [feed, setFeed] = useState<TableFeed>({ bubbles: {}, log: [], n: 0 });
  if (state !== prev) {
    setPrev(state);
    setFeed(advance(feed, prev, state));
  }
  return feed;
}

export function ActivityLog({ feed, limit = 6 }: { feed: TableFeed; limit?: number }) {
  if (feed.log.length === 0) return null;
  return (
    <Panel title="ACTIVITY">
      {feed.log.slice(0, limit).map((l, i) => (
        <Text
          key={l.id}
          style={[
            styles.logLine,
            l.tone === 'good' && { color: C.good },
            l.tone === 'bad' && { color: C.danger },
            i > 0 && styles.logOld,
          ]}>
          ▸ {l.text}
        </Text>
      ))}
    </Panel>
  );
}

// ---------- The arena ----------

function buddyEmoji(id?: string) {
  return BUDDIES.find((b) => b.id === id)?.emoji ?? BUDDIES[0].emoji;
}

/** A rock ledge for a miner to stand on. */
function Ledge({ width, lit }: { width: number; lit?: boolean }) {
  const h = width * 0.4;
  return (
    <Svg width={width} height={h} viewBox="0 0 100 40">
      <Ellipse cx={50} cy={34} rx={44} ry={5} fill="rgba(0,0,0,0.45)" />
      <Path d="M6 20 C8 10 22 5 50 5 S92 10 94 20 L88 30 C70 36 30 36 12 30 Z" fill={lit ? '#5a3a24' : '#3d3a40'} />
      <Path d="M6 20 C8 10 22 5 50 5 S92 10 94 20 C78 14 22 14 6 20 Z" fill="rgba(255,255,255,0.12)" />
      <Path d="M30 22 l6 -3 l5 4 M60 24 l7 -2 l4 3" stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

/** Bundle of dynamite with a fuse; the spark flickers while lit. */
export function TntSprite({ size = 52, lit = true }: { size?: number; lit?: boolean }) {
  const reduceMotion = useReducedMotion();
  const flicker = useSharedValue(1);
  useEffect(() => {
    if (!lit || reduceMotion) return;
    flicker.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 90 }), withTiming(0.8, { duration: 110 })),
      -1,
      true,
    );
    return () => cancelAnimation(flicker);
  }, [lit, reduceMotion, flicker]);
  const spark = useAnimatedStyle(() => ({ transform: [{ scale: flicker.value }] }));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path d="M24 18 C24 10 30 8 34 6" stroke="#cbb79a" strokeWidth={2} fill="none" strokeLinecap="round" />
        {[10, 19, 28].map((x) => (
          <Rect key={x} x={x} y={17} width={10} height={26} rx={4} fill="#d63a3a" />
        ))}
        {[10, 19, 28].map((x) => (
          <Rect key={`h${x}`} x={x + 2} y={19} width={2.5} height={22} rx={1.2} fill="rgba(255,255,255,0.3)" />
        ))}
        <Rect x={8} y={26} width={32} height={7} rx={1.5} fill="#2a1a10" />
        <Rect x={8} y={26} width={32} height={2} fill="rgba(255,255,255,0.15)" />
      </Svg>
      {lit && (
        <Animated.View style={[styles.spark, { left: (34 / 48) * size - 7, top: (6 / 48) * size - 7 }, spark]}>
          <View style={styles.sparkGlow} />
          <View style={styles.sparkCore} />
        </Animated.View>
      )}
    </View>
  );
}

function Burst({ size = 90 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="m12 1 2.6 6.3L21 5.5l-2.9 6 4.9 4-6.5.6L15 23l-3-5.2L9 23l-1.5-6.9L1 15.5l4.9-4L3 5.5l6.4 1.8Z" fill={C.fuse} />
      <Path d="m12 5 1.6 4 4.2-1-2 3.9 3.1 2.6-4.2.4-.9 4.4L12 16l-1.8 3.3-.9-4.4-4.2-.4 3.1-2.6-2-3.9 4.2 1Z" fill={C.accent} />
      <Circle cx={12} cy={12} r={2.2} fill={C.spark} />
    </Svg>
  );
}

export function Arena({
  state,
  focusId,
  bubbles = {},
  fraction = 1,
  openSeats = 0,
}: {
  state: TntState;
  /** This player's seat is drawn at the bottom. */
  focusId: string | null;
  bubbles?: Record<string, Bubble>;
  /** Fuse remaining, 0..1. */
  fraction?: number;
  /** Empty ledges to draw (lobby). */
  openSeats?: number;
}) {
  const [width, setWidth] = useState(0);
  const players = state.players;
  const total = Math.max(1, players.length + openSeats);
  const height = Math.max(300, Math.min(460, width * 1.08));
  const seatW = total <= 4 ? 100 : total <= 6 ? 88 : 76;
  const cx = width / 2;
  const cy = height / 2 - 6;
  const rx = Math.max(0, width / 2 - seatW / 2 - 2);
  const ry = Math.max(0, height / 2 - 66);
  const focus = Math.max(0, players.findIndex((p) => p.id === focusId));

  const seatPos = (i: number) => {
    const a = Math.PI / 2 + ((i - focus) * 2 * Math.PI) / total;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  };

  const playing = state.phase === 'playing';
  const boomId = state.phase === 'boom' && state.lastEvent?.kind === 'boom' ? state.lastEvent.playerId : null;
  const targetId = playing ? state.turn : boomId;
  const targetIdx = players.findIndex((p) => p.id === targetId);
  const target = targetIdx >= 0 ? seatPos(targetIdx) : { x: cx, y: cy };
  const pull = boomId ? 0.85 : 0.4;
  const tntX = cx + (target.x - cx) * pull;
  const tntY = cy + (target.y - cy) * pull;

  return (
    <View style={[styles.arena, { height }]} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          <ArenaFloor width={width} height={height} />
          {Array.from({ length: total }, (_, i) => {
            const pos = seatPos(i);
            const p = players[i];
            return (
              <View key={p?.id ?? `open${i}`} style={[styles.seat, { width: seatW, left: pos.x - seatW / 2, top: pos.y - seatW * 0.42 }]}>
                {p ? (
                  <Seat
                    player={p}
                    width={seatW}
                    holder={playing && state.turn === p.id}
                    boomed={boomId === p.id}
                    winner={state.phase === 'over' && state.winner === p.id}
                    me={p.id === focusId}
                    bubble={bubbles[p.id]}
                    showHearts={state.phase !== 'lobby'}
                  />
                ) : (
                  <View style={styles.openSeat}>
                    <View style={{ height: seatW * 0.34 }} />
                    <Ledge width={seatW * 0.82} />
                    <Text style={styles.openText}>open</Text>
                  </View>
                )}
              </View>
            );
          })}
          <MovingTnt x={tntX} y={tntY} lit={playing} urgent={playing && fraction < 0.3} hidden={!!boomId || state.phase === 'over'} />
          {boomId && targetIdx >= 0 && (
            <Animated.View entering={ZoomIn.springify().damping(8)} style={[styles.burst, { left: target.x - 50, top: target.y - 85 }]}>
              <Burst size={100} />
            </Animated.View>
          )}
          {state.phase === 'lobby' && (
            <Text style={[styles.zzz, { left: cx + 18, top: cy - 44 }]}>z z z</Text>
          )}
        </>
      )}
    </View>
  );
}

function ArenaFloor({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 4} ry={height / 2 - 18} fill="rgba(0,0,0,0.28)" />
      <Ellipse cx={width / 2} cy={height / 2} rx={width * 0.36} ry={height * 0.33} fill="rgba(0,0,0,0.18)" stroke="rgba(255,193,69,0.06)" strokeWidth={2} />
      <Ellipse cx={width / 2} cy={height / 2} rx={width * 0.2} ry={height * 0.18} fill="rgba(0,0,0,0.18)" stroke="rgba(255,193,69,0.05)" strokeWidth={2} strokeDasharray="6 8" />
    </Svg>
  );
}

function MovingTnt({ x, y, lit, urgent, hidden }: { x: number; y: number; lit: boolean; urgent: boolean; hidden: boolean }) {
  const reduceMotion = useReducedMotion();
  const tx = useSharedValue(x);
  const ty = useSharedValue(y);
  const rot = useSharedValue(0);

  useEffect(() => {
    tx.value = reduceMotion ? x : withSpring(x, { damping: 14, stiffness: 140 });
    ty.value = reduceMotion ? y : withSpring(y, { damping: 14, stiffness: 140 });
  }, [x, y, tx, ty, reduceMotion]);

  useEffect(() => {
    if (!lit || reduceMotion) {
      rot.value = withTiming(0);
      return;
    }
    const d = urgent ? 55 : 220;
    rot.value = withRepeat(withSequence(withTiming(urgent ? -12 : -5, { duration: d }), withTiming(urgent ? 12 : 5, { duration: d })), -1, true);
    return () => cancelAnimation(rot);
  }, [lit, urgent, rot, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value - 30 }, { translateY: ty.value - 34 }, { rotate: `${rot.value}deg` }],
    opacity: withTiming(hidden ? 0 : 1, { duration: 120 }),
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.tnt, style]}>
      <TntSprite size={60} lit={lit} />
      <View style={styles.tntShadow} />
    </Animated.View>
  );
}

function Seat({
  player,
  width,
  holder,
  boomed,
  winner,
  me,
  bubble,
  showHearts,
}: {
  player: TntPlayer;
  width: number;
  holder: boolean;
  boomed: boolean;
  winner: boolean;
  me: boolean;
  bubble?: Bubble;
  showHearts: boolean;
}) {
  const dead = !player.alive;
  const emojiSize = width * 0.34;
  return (
    <View style={[styles.seatInner, dead && styles.dead]}>
      {winner && <Icon name="crown" size={20} color={C.accent} filled strokeWidth={1.5} />}
      <View style={[styles.avatar, holder && styles.avatarHot, boomed && styles.avatarBoom]}>
        {dead ? (
          <Icon name="skull" size={emojiSize * 0.9} color={C.muted} />
        ) : (
          <Text style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.2 }}>{buddyEmoji(player.buddy)}</Text>
        )}
      </View>
      <View style={styles.ledge}>
        <Ledge width={width * 0.82} lit={holder} />
      </View>
      <Text numberOfLines={1} style={[styles.name, holder && { color: C.fuse }, me && styles.nameMe]}>
        {player.name}
      </Text>
      {showHearts && (
        <View style={styles.hearts}>
          {Array.from({ length: START_HEARTS }, (_, h) => (
            <Icon key={h} name="heart" size={11} filled={h < player.hearts} color={h < player.hearts ? C.danger : C.faint} strokeWidth={2.4} />
          ))}
        </View>
      )}
      {bubble && (
        <Animated.View
          key={bubble.text}
          entering={ZoomIn.duration(180)}
          style={[styles.bubble, { maxWidth: width * 1.6 }, bubble.ok ? styles.bubbleOk : styles.bubbleBad]}>
          <Text numberOfLines={1} style={[styles.bubbleText, !bubble.ok && styles.bubbleTextBad]}>
            {bubble.text}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ---------- Bottom bar ----------

export function HeartDial({ hearts }: { hearts: number }) {
  return (
    <View style={styles.dial}>
      <Icon name="heart" size={14} color={C.danger} filled />
      <Text style={styles.dialText}>{hearts}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { padding: S.md, gap: S.md, paddingBottom: S.xl, maxWidth: 640, width: '100%', alignSelf: 'center' },
  footer: {
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.md,
    backgroundColor: 'rgba(8,5,3,0.92)',
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  panel: {
    backgroundColor: 'rgba(14,9,6,0.88)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: R.md,
    padding: S.md,
    gap: S.sm,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: 2 },
  panelTitle: { color: C.text, fontFamily: F.bold, fontSize: 12, letterSpacing: 3 },
  rule: { flex: 1, height: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: C.border },
  panelAction: { color: C.accent, fontFamily: F.bold, fontSize: 11, letterSpacing: 1.5, textDecorationLine: 'underline' },
  hudRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  hudBox: {
    minWidth: 86,
    backgroundColor: 'rgba(14,9,6,0.9)',
    borderColor: C.border,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderBottomColor: C.edge,
    borderRadius: R.sm,
    paddingHorizontal: S.md,
    paddingVertical: 6,
  },
  hudLabel: { color: C.muted, fontFamily: F.bold, fontSize: 9, letterSpacing: 2.5 },
  hudValue: { fontFamily: F.display, fontSize: 22, letterSpacing: 1 },
  hudMiddle: { flex: 1, textAlign: 'center', color: C.muted, fontFamily: F.bold, fontSize: 10, letterSpacing: 3 },
  banner: {
    backgroundColor: 'rgba(14,9,6,0.92)',
    borderColor: C.border,
    borderTopColor: C.highlight,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderBottomColor: C.edge,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    gap: 4,
  },
  bannerLabel: { color: C.fuse, fontFamily: F.bold, fontSize: 11, letterSpacing: 3.5 },
  bannerText: { color: C.text, fontFamily: F.heavy, fontSize: 22, lineHeight: 28 },
  bannerHint: { color: C.muted, fontFamily: F.medium, fontSize: 11, letterSpacing: 1.5, textAlign: 'center', marginTop: 2 },
  arena: { width: '100%' },
  seat: { position: 'absolute', alignItems: 'center', overflow: 'visible' },
  seatInner: { alignItems: 'center', width: '100%', overflow: 'visible' },
  dead: { opacity: 0.4 },
  avatar: { borderRadius: 999, paddingHorizontal: 4, marginBottom: -10, zIndex: 1 },
  avatarHot: {
    backgroundColor: 'rgba(255,122,47,0.25)',
    shadowColor: C.fuse,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarBoom: { backgroundColor: 'rgba(255,90,110,0.35)' },
  ledge: { alignItems: 'center' },
  name: { color: C.text, fontFamily: F.bold, fontSize: 12, letterSpacing: 0.5, maxWidth: '100%', marginTop: -2 },
  nameMe: { textDecorationLine: 'underline' },
  hearts: { flexDirection: 'row', gap: 2, marginTop: 2 },
  bubble: {
    marginTop: 4,
    borderRadius: R.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(8,5,3,0.92)',
  },
  bubbleOk: { borderColor: 'rgba(79,209,139,0.55)' },
  bubbleBad: { borderColor: 'rgba(255,90,110,0.55)' },
  bubbleText: { color: C.text, fontFamily: F.semi, fontSize: 13 },
  bubbleTextBad: { color: C.danger, textDecorationLine: 'line-through' },
  openSeat: { alignItems: 'center', opacity: 0.55 },
  openText: { color: C.faint, fontFamily: F.bold, fontSize: 10, letterSpacing: 2 },
  tnt: { position: 'absolute', left: 0, top: 0, width: 60, alignItems: 'center' },
  tntShadow: { width: 40, height: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', marginTop: 2 },
  spark: { position: 'absolute', width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  sparkGlow: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: C.fuse, opacity: 0.55 },
  sparkCore: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.spark },
  burst: { position: 'absolute' },
  zzz: { position: 'absolute', color: C.muted, fontFamily: F.bold, fontSize: 12, letterSpacing: 4 },
  dial: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.edge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dialText: { color: C.text, fontFamily: F.display, fontSize: 18 },
  logLine: { color: C.muted, fontFamily: F.medium, fontSize: 13 },
  logOld: { opacity: 0.7 },
});
