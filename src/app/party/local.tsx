import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { TntBoard } from '@/components/tnt-board';
import { ActivityLog, Arena, HudBox, HudRow, Panel, TntScreen, useTableFeed } from '@/components/tnt-arena';
import { TntStats, TntTitle } from '@/components/tnt-lobby';
import { Button, Input, Row } from '@/components/ui';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  backToLobby,
  newLobby,
  setLobbyPlayers,
  startGame,
  submitAnswer,
  tick,
  type TntState,
} from '@/game/tnt';
import { BUDDIES } from '@/game/tiers';
import { progressStore } from '@/lib/progress';
import { C, F, S } from '@/theme';

/** Player 1 brings their own buddy; everyone else gets one from the roster. */
function buddyForSeat(i: number) {
  if (i === 0) return progressStore.get().buddy;
  return BUDDIES[i % BUDDIES.length].id;
}

function lobbyWith(names: string[]) {
  return setLobbyPlayers(
    newLobby(),
    names.map((n, i) => ({ id: `p${i}`, name: n.trim() || `Player ${i + 1}`, buddy: buddyForSeat(i) })),
  );
}

export default function LocalParty() {
  const [names, setNames] = useState<string[]>(() => [progressStore.get().playerName || 'Player 1', 'Player 2']);
  const [state, setState] = useState<TntState>(newLobby);
  const feed = useTableFeed(state);

  useEffect(() => {
    if (state.phase !== 'playing' && state.phase !== 'boom') return;
    const t = setInterval(() => setState((s) => tick(s, Date.now(), Math.random)), 100);
    return () => clearInterval(t);
  }, [state.phase]);

  const start = () => setState(startGame(lobbyWith(names), Date.now(), Math.random));

  if (state.phase === 'lobby') {
    const preview = lobbyWith(names);
    return (
      <TntScreen
        footer={
          <View style={styles.footer}>
            <TntStats miners={names.length} />
            <Button label="Light the fuse" icon="tnt" onPress={start} disabled={names.length < MIN_PLAYERS} />
          </View>
        }>
        <HudRow
          left={<HudBox label="MODE" value="LOCAL" />}
          middle="PASS & PLAY"
          right={<HudBox label="MINERS" value={`${names.length}/${MAX_PLAYERS}`} color={C.danger} />}
        />
        <TntTitle tagline="one phone · pass it with the TNT" />
        <Arena state={preview} focusId="p0" />
        <Panel title="MINERS">
          {names.map((n, i) => (
            <Row key={i}>
              <Text style={styles.buddy}>{BUDDIES.find((b) => b.id === buddyForSeat(i))?.emoji}</Text>
              <Input
                value={n}
                onChangeText={(t) => setNames(names.map((x, j) => (j === i ? t : x)))}
                placeholder={`Player ${i + 1}`}
                style={styles.flex}
                maxLength={20}
              />
              {names.length > MIN_PLAYERS && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${n || `player ${i + 1}`}`}
                  hitSlop={8}
                  onPress={() => setNames(names.filter((_, j) => j !== i))}
                  style={styles.remove}>
                  <Icon name="x" size={18} color={C.muted} />
                </Pressable>
              )}
            </Row>
          ))}
          {names.length < MAX_PLAYERS && (
            <Pressable onPress={() => setNames([...names, ''])} style={styles.add}>
              <Icon name="plus" size={16} color={C.accent} strokeWidth={2.6} />
              <Text style={styles.addText}>ADD MINER</Text>
            </Pressable>
          )}
        </Panel>
      </TntScreen>
    );
  }

  if (state.phase === 'over') {
    const winner = state.players.find((p) => p.id === state.winner);
    return (
      <TntScreen
        footer={
          <View style={styles.footer}>
            <Button
              label="Play again"
              icon="refresh"
              onPress={() => setState(startGame(backToLobby(state), Date.now(), Math.random))}
            />
            <Button label="Change miners" variant="secondary" onPress={() => setState(newLobby())} />
          </View>
        }>
        <HudRow
          left={<HudBox label="MODE" value="LOCAL" />}
          middle="GAME OVER"
          right={<HudBox label="STANDING" value={`${winner ? 1 : 0}/${state.players.length}`} color={C.danger} />}
        />
        <TntTitle title={winner ? `${winner.name} wins!` : 'Everyone blew up!'} tagline="last miner standing" />
        <Arena state={state} focusId="p0" bubbles={feed.bubbles} />
        <ActivityLog feed={feed} />
      </TntScreen>
    );
  }

  return (
    <TntBoard
      state={state}
      myId={null}
      onSubmit={(text) => setState((s) => submitAnswer(s, s.turn ?? '', text, Date.now()))}
      roomLabel="MODE"
      roomValue="LOCAL"
      feed={feed}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { gap: S.sm, maxWidth: 640, width: '100%', alignSelf: 'center' },
  buddy: { fontSize: 24, width: 32, textAlign: 'center' },
  remove: { padding: S.xs },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: S.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border,
    borderRadius: 8,
  },
  addText: { color: C.accent, fontFamily: F.bold, fontSize: 12, letterSpacing: 2 },
});
