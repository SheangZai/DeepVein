import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TntState } from '@/game/tnt';
import { C, F, R, S } from '@/theme';

import { FuseBar } from './fuse-bar';
import { Icon } from './icons';
import {
  ActivityLog,
  Arena,
  CategoryBanner,
  HeartDial,
  HudBox,
  HudRow,
  Panel,
  TntScreen,
  type TableFeed,
} from './tnt-arena';
import { Input } from './ui';

function useTicker(active: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/**
 * A running TNT Toss game: HUD, category, the table of miners, and an input
 * bar pinned to the bottom. `myId` null means pass-and-play: whoever holds the
 * TNT types on this device.
 */
export function TntBoard({
  state,
  myId,
  offset = 0,
  onSubmit,
  roomLabel,
  roomValue,
  notice,
  feed,
  spectating,
}: {
  state: TntState;
  myId: string | null;
  offset?: number;
  onSubmit: (text: string) => void;
  roomLabel: string;
  roomValue: string;
  notice?: string;
  /** From useTableFeed in the parent, so the log survives phase changes. */
  feed: TableFeed;
  spectating?: boolean;
}) {
  const [text, setText] = useState('');
  const now = useTicker(state.phase === 'playing');
  const holder = state.players.find((p) => p.id === state.turn);
  const playing = state.phase === 'playing';
  const myTurn = playing && !spectating && (myId === null || state.turn === myId);
  const remaining = Math.max(0, state.fuseEndsAt - (now + offset));
  const fraction = playing ? remaining / state.fuseMs : 0;
  const standing = state.players.filter((p) => p.alive).length;
  const me = myId === null ? holder : state.players.find((p) => p.id === myId);
  const boomed = state.phase === 'boom' && state.lastEvent?.kind === 'boom'
    ? state.players.find((p) => p.id === state.lastEvent?.playerId)
    : null;

  const send = () => {
    if (!text.trim() || !myTurn) return;
    onSubmit(text);
    setText('');
  };

  // A rejected answer leaves the TNT with the same player, who can try again.
  const e = state.lastEvent;
  const retry = playing && e?.kind === 'reject' && e.playerId === state.turn ? e : null;
  const mine = myTurn && myId !== null;
  const status = boomed
    ? `BOOM! ${boomed.name} got caught`
    : retry
      ? `${mine ? '' : `${holder?.name ?? '…'}: `}${retry.reason === 'used' ? `${retry.text} was already said` : `“${retry.text}” doesn’t fit`}. ${mine ? 'Try again!' : 'Still holding it…'}`
      : playing
        ? mine
          ? 'You’re holding the TNT!'
          : `${holder?.name ?? '…'} is up`
        : '';

  return (
    <TntScreen
      footer={
        <View style={styles.bar}>
          <View style={styles.barRow}>
            <HeartDial hearts={me?.hearts ?? 0} />
            <Input
              value={text}
              onChangeText={setText}
              onSubmitEditing={send}
              editable={myTurn}
              autoFocus={myTurn}
              autoCorrect={false}
              autoCapitalize="words"
              submitBehavior="submit"
              returnKeyType="send"
              placeholder={
                myTurn ? (myId === null ? `${holder?.name}, name one…` : 'Name one, fast…') : `${holder?.name ?? 'Next miner'} is up…`
              }
              style={[styles.input, myTurn && styles.inputLive]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pass the TNT"
              onPress={send}
              disabled={!myTurn || !text.trim()}
              style={({ pressed }) => [styles.send, (!myTurn || !text.trim()) && styles.sendOff, pressed && styles.sendPressed]}>
              <Icon name="tnt" size={18} color={C.text} strokeWidth={2.4} />
              <Text style={styles.sendText}>PASS</Text>
            </Pressable>
          </View>
          <FuseBar fraction={fraction} />
        </View>
      }>
      <HudRow
        left={<HudBox label={roomLabel} value={roomValue} />}
        middle={`ROUND ${Math.max(1, state.seenPrompts.length)}`}
        right={<HudBox label="STANDING" value={`${standing}/${state.players.length}`} color={C.danger} />}
      />
      <CategoryBanner state={state} />
      {notice && <Text style={styles.notice}>{notice}</Text>}
      <Arena state={state} focusId={myId ?? state.players[0]?.id ?? null} bubbles={feed.bubbles} fraction={fraction} />
      <Text style={[styles.status, (myTurn || boomed) && { color: C.fuse }, retry && { color: C.danger }]}>
        {status ? `▸ ${status}` : ' '}
      </Text>
      <ActivityLog feed={feed} />
      {state.used.length > 0 && (
        <Panel title={`ALREADY SAID · ${state.used.length}`}>
          <View style={styles.usedRow}>
            {state.used.slice(0, 40).map((u) => (
              <Text key={u} style={styles.used}>
                {u}
              </Text>
            ))}
          </View>
        </Panel>
      )}
    </TntScreen>
  );
}

const styles = StyleSheet.create({
  bar: { gap: S.sm, maxWidth: 640, width: '100%', alignSelf: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  input: { flex: 1, minWidth: 0, fontSize: 18, paddingVertical: S.sm + 4 },
  inputLive: { borderColor: C.fuse },
  send: {
    height: 50,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    backgroundColor: C.danger,
    borderBottomWidth: 4,
    borderBottomColor: '#a3283a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sendOff: { opacity: 0.4 },
  sendPressed: { borderBottomWidth: 1, marginTop: 3 },
  sendText: { color: C.text, fontFamily: F.heavy, fontSize: 14, letterSpacing: 2 },
  status: { textAlign: 'center', color: C.muted, fontFamily: F.bold, fontSize: 14, letterSpacing: 1.5, marginTop: -S.sm },
  notice: { textAlign: 'center', color: C.muted, fontFamily: F.medium, fontSize: 13 },
  usedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  used: {
    color: C.muted,
    fontSize: 13,
    fontFamily: F.medium,
    backgroundColor: C.surfaceRaised,
    borderRadius: R.pill,
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
});
