import type { CategoryId } from './index';

export interface ShaftLevel {
  name: string;
  /** Prompt ids, easiest level first. Each prompt sits in exactly one level. */
  prompts: string[];
}

/** Topics (called shafts in code): themed packs of prompts, played level by level. */
export interface Shaft {
  id: string;
  category: CategoryId;
  title: string;
  emoji: string;
  blurb: string;
  levels: ShaftLevel[];
}

export const SHAFTS: Shaft[] = [
  {
    id: 'geography',
    category: 'geography',
    title: 'Geography',
    emoji: '🗺️',
    blurb: 'Countries, capitals, islands, seas and the places nobody remembers.',
    levels: [
      { name: 'Close to home', prompts: ['southeast-asia', 'sea-capitals', 'malaysian-states', 'indonesian-islands', 'asia'] },
      { name: 'Asia & Oceania', prompts: ['asia-capitals', 'australia-states', 'eight-thousanders', 'island-countries', 'rivers'] },
      { name: 'The wide world', prompts: ['africa', 'europe', 'south-america', 'oceans-seas', 'deserts'] },
      { name: 'Deep cuts', prompts: ['us-states', 'state-capitals', 'canada-provinces', 'landlocked', 'european-capitals'] },
    ],
  },
  {
    id: 'science',
    category: 'science',
    title: 'Science',
    emoji: '🧪',
    blurb: 'Bodies, rocks, gems, stars and the people who figured it all out.',
    levels: [
      { name: 'Body basics', prompts: ['organs', 'bones', 'muscles', 'vitamins', 'diseases'] },
      { name: 'Under the ground', prompts: ['rocks-minerals', 'gemstones', 'metals', 'elements', 'dinosaurs'] },
      { name: 'Up in the sky', prompts: ['planets', 'clouds', 'gases', 'moons', 'constellations'] },
      { name: 'Big brains', prompts: ['scientists', 'programming-languages', 'units', 'si-units', 'noble-gases'] },
    ],
  },
  {
    id: 'sports',
    category: 'sports',
    title: 'Sports',
    emoji: '🏟️',
    blurb: 'Footballers, shuttlers, champions, board games and esports.',
    levels: [
      { name: 'Kick-off', prompts: ['footballers', 'football-terms', 'world-cup-winners', 'martial-arts', 'sports-equipment'] },
      { name: 'Courts & rackets', prompts: ['badminton-players', 'nba', 'nba-players', 'tennis-champions', 'olympic-sports'] },
      { name: 'Track, pool & table', prompts: ['water-sports', 'athletics-events', 'board-games', 'esports-games', 'olympic-hosts'] },
      { name: 'Hall of fame', prompts: ['english-champions', 'premier-league-2526', 'ballon-dor', 'f1-champions', 'nfl'] },
    ],
  },
  {
    id: 'screen',
    category: 'screen',
    title: 'Screen & Music',
    emoji: '🎬',
    blurb: 'Cartoons, anime, K-pop, Netflix and the big screen.',
    levels: [
      { name: 'Cartoon corner', prompts: ['pixar', 'disney-animated', 'cartoons', 'dwarfs', 'disney-princesses'] },
      { name: 'Anime & games', prompts: ['anime', 'ghibli', 'pokemon-gen1', 'nintendo-characters', 'mcu'] },
      { name: 'On the playlist', prompts: ['kpop-groups', 'pop-singers', 'music-genres', 'instruments', 'dances'] },
      { name: 'Big screen', prompts: ['netflix-series', 'bond-actors', 'best-picture', 'harry-potter-books', 'beatles'] },
    ],
  },
  {
    id: 'food',
    category: 'food',
    title: 'Food',
    emoji: '🍜',
    blurb: 'Hawker favourites, kuih, spices, sauces and food from all over Asia.',
    levels: [
      { name: 'Hawker favourites', prompts: ['sea-dishes', 'noodles', 'kuih', 'coffee-drinks', 'fruits'] },
      { name: 'Spice rack', prompts: ['spices', 'herbs', 'sauces', 'nuts', 'vegetables'] },
      { name: 'Around Asia', prompts: ['japanese-food', 'chinese-food', 'indian-food', 'tea', 'seafood'] },
      { name: 'Bakery & beyond', prompts: ['breads', 'cakes', 'pasta', 'cheese', 'fast-food'] },
    ],
  },
  {
    id: 'nature',
    category: 'nature',
    title: 'Nature',
    emoji: '🌿',
    blurb: 'Pets, rainforest creatures, whales, raptors and wild places.',
    levels: [
      { name: 'Pets & farms', prompts: ['dog-breeds', 'cat-breeds', 'farm-animals', 'baby-animals', 'houseplants'] },
      { name: 'Into the jungle', prompts: ['rainforest-animals', 'primates', 'snakes', 'wild-cats', 'nocturnal-animals'] },
      { name: 'Wet & wild', prompts: ['freshwater-fish', 'whales-dolphins', 'sharks', 'not-fish', 'natural-disasters'] },
      { name: 'Wild places', prompts: ['safari-animals', 'birds-of-prey', 'flightless-birds', 'marsupials', 'flowers'] },
    ],
  },
  {
    id: 'words',
    category: 'words',
    title: 'Culture & History',
    emoji: '📜',
    blurb: 'Brands, legends, empires, landmarks and alphabet soup.',
    levels: [
      { name: 'Everyday words', prompts: ['colours', 'languages', 'car-brands', 'phone-brands', 'fashion-brands'] },
      { name: 'Legends & tales', prompts: ['fairy-tales', 'mythical-creatures', 'greek-gods', 'deadly-sins', 'chinese-zodiac'] },
      { name: 'History lessons', prompts: ['empires', 'ancient-wonders', 'landmarks', 'painters', 'currencies'] },
      { name: 'Hard copy', prompts: ['zodiac', 'greek-letters', 'nato-alphabet', 'shakespeare', 'us-presidents'] },
    ],
  },
  {
    id: 'everyday',
    category: 'everyday',
    title: 'Everyday',
    emoji: '🧺',
    blurb: 'Makeup, maths, jobs, snacks and everything around the house.',
    levels: [
      { name: 'Around the house', prompts: ['kitchen-items', 'furniture', 'rooms', 'bathroom-items', 'tools'] },
      { name: 'Getting dressed', prompts: ['clothing', 'fabrics', 'makeup', 'family', 'emotions'] },
      { name: 'School days', prompts: ['school-subjects', 'math-terms', 'shapes', 'computer-parts', 'apps'] },
      { name: 'Out and about', prompts: ['jobs', 'transport', 'any-sport', 'weather', 'sea-festivals'] },
      { name: 'Mixed bag', prompts: ['breakfast', 'drinks', 'desserts', 'body-parts', 'superheroes'] },
      { name: 'Creatures & critters', prompts: ['animals', 'insects', 'sea-creatures', 'birds', 'trees'] },
    ],
  },
];

export function getShaft(id: string): Shaft | undefined {
  return SHAFTS.find((s) => s.id === id);
}

export function getShaftLevel(shaft: Shaft, level: number): ShaftLevel | undefined {
  return shaft.levels[level - 1];
}
