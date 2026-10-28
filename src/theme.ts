export const C = {
  bg: '#120c08',
  surface: '#241913',
  surfaceRaised: '#33241a',
  border: '#4a3627',
  highlight: '#6b4f39',
  edge: '#0a0604',
  text: '#f6ecdc',
  muted: '#b39d86',
  faint: '#7a6552',
  accent: '#ffc145',
  accentEdge: '#b97a12',
  accentText: '#2a1a05',
  danger: '#ff5a6e',
  good: '#4fd18b',
  fuse: '#ff7a2f',
  spark: '#fff3b0',
} as const;

/** Earth layers from the surface down. Used by the strata background. */
export const STRATA = ['#4a3422', '#3b2819', '#2d1e14', '#22170f', '#1a110b', '#120c08'] as const;

/** Font families. Loaded in the root layout; don't combine with fontWeight. */
export const F = {
  display: 'LilitaOne_400Regular',
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semi: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
  heavy: 'Rubik_800ExtraBold',
} as const;

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const R = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;
