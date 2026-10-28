/* Content sanity checks. Run: npx tsx scripts/validate-content.ts */
(globalThis as any).__DEV__ = false;

const EXPECTED_COUNTS: Record<string, number> = {
  'us-states': 50,
  africa: 54,
  'south-america': 12,
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
  'southeast-asia': 11,
  'sea-capitals': 11,
  'australia-states': 8,
  'canada-provinces': 13,
  landlocked: 45,
  'eight-thousanders': 14,
  constellations: 88,
  'noble-gases': 7,
  'si-units': 7,
  vitamins: 13,
  'premier-league-2526': 20,
  'ballon-dor': 47,
  'pokemon-gen1': 151,
  'harry-potter-books': 7,
  'chinese-zodiac': 12,
  'ancient-wonders': 7,
  'deadly-sins': 7,
  zodiac: 13,
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
  ['sea-capitals', 'kl', 'Kuala Lumpur'],
  ['sea-dishes', 'char kuey teow', 'Char Kway Teow'],
  ['sea-dishes', 'pho', 'Pho'],
  ['sea-dishes', 'banh mi', 'Banh Mi'],
  ['sea-dishes', 'chili crab', 'Chilli crab'],
  ['sea-dishes', 'linut', 'Ambuyat'],
  ['nba', 'lakers', 'Los Angeles Lakers'],
  ['nba', 'philadelphia 76ers', 'Philadelphia 76ers'],
  ['dinosaurs', 't rex', 'Tyrannosaurus'],
  ['dinosaurs', 'pterodactyl', null],
  // Short forms and alternate names players actually type.
  ['us-states', 'NY', 'New York'],
  ['us-states', 'cali', 'California'],
  ['nba', 'boston', 'Boston Celtics'],
  ['nba', 'los angeles', null],
  ['nfl', 'new york', null],
  ['beatles', 'george', 'George Harrison'],
  ['currencies', 'usd', 'Dollar'],
  ['currencies', 'rm', 'Ringgit'],
  ['currencies', 'kwanza', 'Kwanza'],
  ['organs', 'ears', 'Ear'],
  ['bones', 'spine', 'Vertebra'],
  ['olympic-sports', 'pole vault', 'Athletics'],
  ['wild-cats', 'white tiger', 'Tiger'],
  ['sea-dishes', 'nasi briyani', 'Nasi Briyani'],
  ['sea-dishes', 'roti tisu', 'Roti Tisu'],
  ['spices', 'kunyit', 'Turmeric'],
  ['spices', 'kemukus', 'Cubeb'],
  ['fruits', 'manggis', 'Mangosteen'],
  ['fruits', 'marang', 'Tarap'],
  ['vegetables', 'brinjal', 'Eggplant'],
  ['coffee-drinks', 'kopi o', 'Kopi O'],
  ['flowers', 'bunga raya', 'Hibiscus'],
  ['pokemon-gen1', 'nidoran', 'Nidoran (female)'],
  ['pokemon-gen1', 'farfetchd', "Farfetch'd"],
  ['pokemon-gen1', 'togepi', null],
  ['mcu', 'endgame', 'Avengers: Endgame'],
  ['mcu', 'guardians 2', 'Guardians of the Galaxy Vol. 2'],
  ['mcu', 'guardians 3', 'Guardians of the Galaxy Vol. 3'],
  ['harry-potter-books', "sorcerer's stone", "Harry Potter and the Philosopher's Stone"],
  ['vitamins', 'b12', 'Vitamin B12'],
  ['vitamins', 'b1', 'Vitamin B1'],
  ['vitamins', 'folic acid', 'Vitamin B9'],
  ['constellations', 'big dipper', 'Ursa Major'],
  ['eight-thousanders', 'k2', 'K2'],
  ['chinese-zodiac', 'sheep', 'Goat'],
  ['ballon-dor', 'ronaldo', 'Cristiano Ronaldo'],
  ['car-brands', 'merc', 'Mercedes-Benz'],
  ['sea-capitals', 'naypyitaw', 'Naypyidaw'],
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
