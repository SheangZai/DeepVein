/* Content sanity checks. Run: npx tsx scripts/validate-content.ts */
(globalThis as any).__DEV__ = false;

const EXPECTED_COUNTS: Record<string, number> = {
  'us-states': 50,
  africa: 54,
  'south-america': 12,
  malaysia: 16,
  'state-capitals': 50,
  elements: 118,
  nba: 30,
  nfl: 32,
  'english-champions': 24,
  'world-cup-winners': 8,
  'olympic-hosts': 24,
  'f1-champions': 35,
  dwarfs: 7,
  'disney-princesses': 13,
  'greek-letters': 24,
  'nato-alphabet': 26,
  'us-presidents': 45,
};

// [promptId, input, expected canonical name or null]
const MATCH_CASES: [string, string, string | null][] = [
  ['us-states', 'nebraska', 'Nebraska'],
  ['us-states', 'Nebraksa', 'Nebraska'],
  ['us-states', 'kansas', 'Kansas'],
  ['us-states', 'arkansas', 'Arkansas'],
  ['us-states', 'Ohi', null],
  ['pixar', 'toy story 2', 'Toy Story 2'],
  ['pixar', 'toy story 6', null],
  ['pixar', 'wall-e', 'WALL-E'],
  ['pixar', 'walle', 'WALL-E'],
  ['shakespeare', 'henry v', 'Henry V'],
  ['shakespeare', 'Henry VII', null],
  ['shakespeare', 'midsummer nights dream', "A Midsummer Night's Dream"],
  ['greek-letters', 'nu', 'Nu'],
  ['greek-letters', 'xi', 'Xi'],
  ['greek-letters', 'mi', null],
  ['africa', 'congo', 'Republic of the Congo'],
  ['africa', 'sao tome', 'São Tomé and Príncipe'],
  ['africa', 'niger', 'Niger'],
  ['africa', 'nigeria', 'Nigeria'],
  ['us-presidents', 'roosevelt', 'Franklin D. Roosevelt'],
  ['us-presidents', 'teddy roosevelt', 'Theodore Roosevelt'],
  ['us-presidents', 'the bush', 'George W. Bush'],
  ['elements', 'aluminum', 'Aluminium'],
  ['elements', 'tin', 'Tin'],
  ['elements', 'ytterbium', 'Ytterbium'],
  ['malaysia', 'kl', 'Kuala Lumpur'],
  ['malaysian-food', 'char kuey teow', 'Char Kway Teow'],
  ['nba', 'lakers', 'Los Angeles Lakers'],
  ['nba', 'philadelphia 76ers', 'Philadelphia 76ers'],
  ['dinosaurs', 't rex', 'Tyrannosaurus'],
  ['dinosaurs', 'pterodactyl', null],
];

async function main() {
  const { PROMPTS, BUILD_ISSUES } = await import('../src/content/index');
  const { matchAnswer } = await import('../src/content/build');
  const { promptsForDig } = await import('../src/game/schedule');
  let failures = 0;
  const fail = (msg: string) => {
    failures++;
    console.log('FAIL ' + msg);
  };

  for (const issue of BUILD_ISSUES) fail(`${issue.promptId}: ${issue.message}`);

  const ids = new Set<string>();
  for (const p of PROMPTS) {
    if (ids.has(p.id)) fail(`duplicate prompt id ${p.id}`);
    ids.add(p.id);
    const gems = p.entries.filter((e) => e.tier === 'diamond');
    if (gems.length !== 1) fail(`${p.id}: ${gems.length} diamonds`);
    const names = new Set<string>();
    for (const e of p.entries) {
      if (names.has(e.name)) fail(`${p.id}: duplicate answer ${e.name}`);
      names.add(e.name);
    }
    const expected = EXPECTED_COUNTS[p.id];
    if (expected !== undefined && p.entries.length !== expected) {
      fail(`${p.id}: expected ${expected} answers, found ${p.entries.length}`);
    }
  }

  for (const [id, input, want] of MATCH_CASES) {
    const prompt = PROMPTS.find((p) => p.id === id)!;
    const got = matchAnswer(prompt, input)?.name ?? null;
    if (got !== want) fail(`match ${id} "${input}": want ${want}, got ${got}`);
  }

  for (let dig = 1; dig <= 400; dig++) {
    const list = promptsForDig(dig);
    if (list.length !== 7 || new Set(list).size !== 7) fail(`dig ${dig} has bad prompt list`);
  }

  const total = PROMPTS.reduce((n, p) => n + p.entries.length, 0);
  console.log(`${PROMPTS.length} prompts, ${total} answers, ${failures} failures`);
  process.exit(failures ? 1 : 0);
}

main();
