// =====================================================================
//  THE PALETTE - every color in the game should come from here.
//  Art direction: "cozy storybook diorama" - the home's real colors
//  (sage walls, red brick, black leather, warm wood) plus soft pastels
//  for the fun stuff. Nothing fully saturated, nothing pure black/white.
// =====================================================================

export const P = {
  // The real house
  sage: '#a9bea6', sageDeep: '#8fa68c', brick: '#a4553f', leather: '#34302f',
  forest: '#34503f', bedroomBlue: '#6f819a', laminate: '#a39282',

  // Neutrals
  white: '#fbfaf7', cream: '#f7f1e6', oat: '#e3d3bb', stone: '#bdb5a8',
  slate: '#7f8a99', charcoal: '#2f2b2b', ink: '#3a2a4a', metal: '#bfc4ca', gold: '#d1a640',

  // Woods (only these three)
  woodLight: '#dcbf94', woodMid: '#b07f55', woodDark: '#4d3628',

  // Pastels for her things
  blush: '#f6b3c6', bubblegum: '#ef84ad', lavender: '#bba6e6', lilac: '#e0d3f5',
  sky: '#93c9ea', teal: '#5fb3a8', mint: '#aee0c5', butter: '#f7da7e',
  peach: '#f7b893', ginger: '#f2a25f', coral: '#ec7d72',

  // Nature
  leaf: '#5a9a4e', leafDark: '#3d7440', grass: '#8cc46e', pine: '#355f3f',
  skyTop: '#76bdf0', skyHorizon: '#dff1fb',

  // Light
  lampGlow: '#ffe6b3', warmLight: '#fff0d9',
};

// Colors the C key cycles through for things
export const KID_COLORS = [P.bubblegum, P.blush, P.lavender, P.lilac, P.sky, P.teal, P.mint, P.butter,
  P.peach, P.coral, P.cream, P.woodLight, P.woodMid, P.forest, P.slate, P.charcoal];

// Wall paint
export const WALL_COLORS = [P.sage, P.cream, '#fbe0ea', '#e8def6', '#dceefa', '#e3f2e6', '#fbefc9',
  '#fbdcca', P.bedroomBlue, '#c9e1da', P.white];

// Floors
export const FLOOR_COLORS = [P.laminate, '#c99e72', P.woodMid, '#e8d6bd', '#d6d3cf', '#5f6168',
  '#f3d7df', '#d3e6f5', '#c4dfae', P.white, '#eadbc9'];
