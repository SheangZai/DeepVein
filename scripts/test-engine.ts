/* Simulates TNT Toss games. Run: npx tsx scripts/test-engine.ts */
(globalThis as any).__DEV__ = false;

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.log('FAIL ' + msg);
    process.exitCode = 1;
  }
}

async function main() {
  const tnt = await import('../src/game/tnt');
  const { getPrompt } = await import('../src/content/index');
  const { currentDigNo, msUntilNextDig } = await import('../src/game/schedule');

  let rngState = 1;
  const rand = () => ((rngState = (rngState * 16807) % 2147483647) / 2147483647);

  let t = 1_000_000;
  let s = tnt.newLobby();
  s = tnt.setLobbyPlayers(s, [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ]);
  assert(s.players.length === 3, 'three players in lobby');
  s = tnt.startGame(s, t, rand);
  assert(s.phase === 'playing' && s.turn && s.promptId, 'game started');

  // A valid answer passes the TNT and shortens the fuse.
  const prompt = getPrompt(s.promptId!);
  const first = s.turn!;
  const answer = prompt.entries[0].name;
  s = tnt.submitAnswer(s, first, answer, t);
  assert(s.turn !== first, 'turn passes after valid answer');
  assert(s.fuseMs < tnt.START_FUSE_MS, 'fuse shortens');

  // Repeating it is rejected and the turn stays.
  const holder = s.turn!;
  s = tnt.submitAnswer(s, holder, answer, t);
  assert(s.turn === holder && s.lastEvent?.kind === 'reject', 'repeat rejected');

  // Answers from a player who doesn't hold the TNT are ignored.
  const notHolder = s.players.find((p) => p.id !== holder)!.id;
  const before = s;
  s = tnt.submitAnswer(s, notHolder, prompt.entries[1].name, t);
  assert(s === before, 'out-of-turn answer ignored');

  // Fuse runs out: holder loses a heart, then a new round starts.
  t = s.fuseEndsAt + 1;
  s = tnt.tick(s, t, rand);
  assert(s.phase === 'boom', 'boom phase');
  assert(s.players.find((p) => p.id === holder)!.hearts === tnt.START_HEARTS - 1, 'heart lost');
  t += tnt.BOOM_PAUSE_MS + 1;
  s = tnt.tick(s, t, rand);
  assert(s.phase === 'playing' && s.used.length === 0, 'new round started');
  assert(s.turn === holder, 'boomed player restarts');

  // A player leaving mid-turn passes the TNT on.
  s = tnt.removePlayer(s, s.turn!, t);
  assert(s.turn !== holder && s.phase === 'playing', 'leaver skipped');

  // Run fuses out until someone wins.
  for (let i = 0; i < 50 && s.phase !== 'over'; i++) {
    t = Math.max(s.fuseEndsAt, s.resumeAt) + 1;
    s = tnt.tick(s, t, rand);
  }
  assert(s.phase === 'over' && s.winner, 'game ends with a winner');

  s = tnt.backToLobby(s);
  assert(s.phase === 'lobby' && s.players.every((p) => p.hearts === tnt.START_HEARTS), 'back to lobby');

  assert(tnt.TNT_PROMPT_IDS.length >= 10, `enough TNT categories (${tnt.TNT_PROMPT_IDS.length})`);

  const now = Date.UTC(2026, 9, 28, 15, 59, 0); // 23:59 in UTC+8
  assert(currentDigNo(now) === 28, `dig number on 28 Oct (${currentDigNo(now)})`);
  assert(currentDigNo(now + 61_000) === 29, 'dig rolls over at midnight UTC+8');
  assert(Math.round(msUntilNextDig(now) / 1000) === 60, 'countdown to midnight');

  console.log(process.exitCode ? 'engine tests FAILED' : 'engine tests passed');
}

main();
