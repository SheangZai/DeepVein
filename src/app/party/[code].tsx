import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';

import { TntBoard } from '@/components/tnt-board';
import { ActivityLog, Arena, HudBox, HudRow, TntScreen, useTableFeed } from '@/components/tnt-arena';
import { TntTitle, TntStats, Waiting } from '@/components/tnt-lobby';
import { Button, Center, Heading, Muted, Row, Screen } from '@/components/ui';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/game/tnt';
import { useOnlineRoom } from '@/hooks/use-online-room';
import { cleanName } from '@/lib/names';
import { progressStore } from '@/lib/progress';
import { C, S } from '@/theme';

export default function OnlineRoom() {
  const params = useLocalSearchParams<{ code: string; public?: string }>();
  const code = (params.code ?? '').toUpperCase();
  const isPublic = params.public === '1';
  const { playerName, buddy } = progressStore.get();
  const room = useOnlineRoom(code, cleanName(playerName), isPublic, buddy);
  const { state, isHost, me } = room;
  const feed = useTableFeed(state);
  const roomLabel = isPublic ? 'PUBLIC' : 'ROOM';

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
            {isHost ? (
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
            {isHost ? (
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
});

