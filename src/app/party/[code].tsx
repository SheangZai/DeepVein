import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';

import { TntBoard, useTicker } from '@/components/tnt-board';
import { ActivityLog, Arena, HudBox, HudRow, TntScreen, useTableFeed } from '@/components/tnt-arena';
import { TntTitle, TntStats, Waiting } from '@/components/tnt-lobby';
import { Button, Center, Heading, Muted, Row, Screen } from '@/components/ui';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/game/tnt';
import { useOnlineRoom } from '@/hooks/use-online-room';
import { cleanName } from '@/lib/names';
import { progressStore } from '@/lib/progress';
import { C, F, S } from '@/theme';

export default function OnlineRoom() {
  const params = useLocalSearchParams<{ code: string; public?: string }>();
  const code = (params.code ?? '').toUpperCase();
  const isPublic = params.public === '1';
  const { playerName, buddy } = progressStore.get();
  const room = useOnlineRoom(code, cleanName(playerName), isPublic, buddy);
  const { state, isHost, me } = room;
  const feed = useTableFeed(state);
  const roomLabel = isPublic ? 'PUBLIC' : 'ROOM';
  // Hosts on older app builds don't run public timers; fall back to host control.
  const autoRun = isPublic && typeof state.startsAt === 'number';
  // Public rooms run on timers set in the host's clock.
  const counting = autoRun && ((state.phase === 'lobby' && state.startsAt > 0) || state.phase === 'over');
  const now = useTicker(counting) + room.offset;
  const secondsTo = (at: number) => Math.max(0, Math.ceil((at - now) / 1000));

  if (room.status === 'error') {
    return (
      <Screen scroll={false}>
        <Center>
          <Heading>Couldn’t reach the room</Heading>
          <Muted>Check your connection and try again.</Muted>
          <Button label="Back" onPress={() => router.back()} />
        </Center>
      </Screen>
    );
  }

  if (room.status === 'connecting') {
    return (
      <Screen scroll={false}>
        <Center>
          <ActivityIndicator color={C.accent} size="large" />
          <Muted>Joining room {code}…</Muted>
        </Center>
      </Screen>
    );
  }

  const n = state.players.length;

  if (state.phase === 'lobby') {
    const openSeats = n < MAX_PLAYERS ? Math.min(MAX_PLAYERS - n, Math.max(1, 4 - n)) : 0;
    const canStart = n >= MIN_PLAYERS;
    return (
      <TntScreen
        footer={
          <View style={styles.footer}>
            <TntStats miners={n} />
            {autoRun ? (
              canStart && state.startsAt > 0 ? (
                <>
                  <View style={styles.countdown}>
                    <Text style={styles.countdownText}>STARTING IN {secondsTo(state.startsAt)}s</Text>
                    <Text style={styles.countdownHint}>
                      {n < MAX_PLAYERS ? 'more miners can still join' : 'table full'}
                    </Text>
                  </View>
                  {isHost && <Button label="Start now" icon="tnt" variant="secondary" onPress={room.start} />}
                </>
              ) : (
                <Waiting
                  text={`waiting for ${Math.max(1, MIN_PLAYERS - n)} more miner${MIN_PLAYERS - n > 1 ? 's' : ''} to join`}
                />
              )
            ) : isHost ? (
              <Button
                label={canStart ? 'Light the fuse' : `Waiting for ${MIN_PLAYERS - n} more…`}
                icon="tnt"
                onPress={room.start}
                disabled={!canStart}
              />
            ) : (
              <Waiting text="waiting for the host to light the fuse" />
            )}
          </View>
        }>
        <HudRow
          left={<HudBox label={roomLabel} value={code} />}
          middle="LOBBY"
          right={<HudBox label="READY" value={`${n}/${MAX_PLAYERS}`} color={C.danger} />}
        />
        <TntTitle />
        <Arena state={state} focusId={me} openSeats={openSeats} />
        {!isPublic && (
          <Row>
            <Button
              label="Copy code"
              icon="copy"
              variant="secondary"
              onPress={() => Clipboard.setStringAsync(code)}
              style={styles.flex}
            />
            <Button
              label="Invite"
              icon="share"
              variant="secondary"
              onPress={() => Share.share({ message: `Join my TNT Toss room in Deepvein: ${code}` })}
              style={styles.flex}
            />
          </Row>
        )}
        <ActivityLog feed={feed} />
      </TntScreen>
    );
  }

  if (state.phase === 'over') {
    const winner = state.players.find((p) => p.id === state.winner);
    return (
      <TntScreen
        footer={
          <View style={styles.footer}>
            {autoRun ? (
              <Waiting text={`next game in the lobby in ${secondsTo(state.resumeAt)}s`} />
            ) : isHost ? (
              <Button label="Back to lobby" icon="refresh" onPress={room.playAgain} />
            ) : (
              <Waiting text="waiting for the host…" />
            )}
            <Button label="Leave room" variant="ghost" onPress={() => router.back()} />
          </View>
        }>
        <HudRow
          left={<HudBox label={roomLabel} value={code} />}
          middle="GAME OVER"
          right={<HudBox label="STANDING" value={`${winner ? 1 : 0}/${n}`} color={C.danger} />}
        />
        <TntTitle
          title={winner ? `${winner.name} wins!` : 'Everyone blew up!'}
          tagline={state.winner === me ? 'last miner standing' : 'better luck next round'}
        />
        <Arena state={state} focusId={me} bubbles={feed.bubbles} />
        <ActivityLog feed={feed} />
      </TntScreen>
    );
  }

  const inGame = state.players.some((p) => p.id === me);
  return (
    <TntBoard
      state={state}
      myId={me}
      offset={room.offset}
      onSubmit={room.submit}
      roomLabel={roomLabel}
      roomValue={code}
      feed={feed}
      spectating={!inGame}
      notice={inGame ? undefined : 'You’re watching. You’ll join next round.'}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { gap: S.sm, maxWidth: 640, width: '100%', alignSelf: 'center' },
  countdown: { alignItems: 'center', gap: 2, paddingVertical: S.xs },
  countdownText: { color: C.fuse, fontFamily: F.display, fontSize: 28, letterSpacing: 2 },
  countdownHint: { color: C.muted, fontFamily: F.bold, fontSize: 10, letterSpacing: 2 },
});

