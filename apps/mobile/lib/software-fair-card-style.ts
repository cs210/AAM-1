export type SoftwareFairCardPalette = {
  gradient: readonly [string, string, string];
  accent: string;
};

const SOFTWARE_FAIR_CARD_PALETTES: readonly SoftwareFairCardPalette[] = [
  { gradient: ['#2B1D3F', '#176067', '#161316'], accent: '#7DD3FC' },
  { gradient: ['#19324A', '#6B2D3C', '#201A2D'], accent: '#FCA5A5' },
  { gradient: ['#26351F', '#58407A', '#171A22'], accent: '#C4B5FD' },
  { gradient: ['#1D3354', '#2E6F5E', '#241625'], accent: '#86EFAC' },
  { gradient: ['#432534', '#8A4C28', '#1D2433'], accent: '#FDBA74' },
  { gradient: ['#12333A', '#513765', '#1A1C2A'], accent: '#5EEAD4' },
];

export const SOFTWARE_FAIR_GRADIENT_START = { x: 0, y: 0 } as const;
export const SOFTWARE_FAIR_GRADIENT_END = { x: 1, y: 1 } as const;

export function getSoftwareFairCardPalette(boothNumber: number | null | undefined) {
  const seed = typeof boothNumber === 'number' && Number.isFinite(boothNumber) ? boothNumber : 1;
  const index = Math.abs(seed - 1) % SOFTWARE_FAIR_CARD_PALETTES.length;
  return SOFTWARE_FAIR_CARD_PALETTES[index];
}
