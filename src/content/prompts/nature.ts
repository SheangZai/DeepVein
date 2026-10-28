import type { PromptSource } from '../types';

export const nature: PromptSource[] = [
  {
    id: 'wild-cats',
    category: 'nature',
    text: 'Name a species of wild cat',
    dirt: ['Lion', 'Tiger', 'Cheetah'],
    copper: [
      'Leopard', 'Jaguar', 'Black panther|Panther', 'Cougar|Puma|Mountain lion', 'Lynx',
      'Bobcat', 'Snow leopard', 'Ocelot',
    ],
    emerald: [
      'Clouded leopard', 'Caracal', 'Serval', 'Margay', 'Sand cat', 'Fishing cat',
      "Pallas's cat|Pallas cat|Manul", 'Wildcat|Wild cat|European wildcat', 'Jaguarundi',
      'Black-footed cat', 'Leopard cat', 'Iberian lynx', 'Canada lynx',
      'Sunda clouded leopard',
    ],
    ruby: [
      'Marbled cat', 'Flat-headed cat', 'Rusty-spotted cat', 'Kodkod|Guigna', 'Oncilla',
      'Andean mountain cat', "Geoffroy's cat", 'Asian golden cat', 'African golden cat',
      'Pampas cat|Colocolo', 'Jungle cat', 'Chinese mountain cat',
    ],
    diamond: 'Bay cat|Bornean bay cat',
  },
  {
    id: 'not-fish',
    category: 'nature',
    text: "Name an animal with 'fish' in its name that is NOT a fish",
    dirt: ['Jellyfish', 'Starfish'],
    copper: ['Cuttlefish', 'Crayfish|Crawfish', 'Shellfish', 'Kingfisher', 'Silverfish'],
    emerald: [
      'Fishing cat', 'Fish eagle|African fish eagle', 'Fish owl', 'Fishing spider',
      'Fisher|Fisher cat', 'Devilfish', 'Inkfish',
    ],
    ruby: ['Fishfly'],
    diamond: 'Fish crow',
  },
];
