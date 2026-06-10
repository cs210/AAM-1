export type SoftwareFairBoothMapCoordinate = {
  boothNumber: number;
  x: number;
  y: number;
  rotate: number;
};

export const SOFTWARE_FAIR_MAP_VIEWBOX = {
  x: 38,
  y: 76,
  width: 724,
  height: 560,
} as const;

export const SOFTWARE_FAIR_ROOM_PATH = 'M 72 88 L 728 88 L 752 612 L 400 628 L 48 612 Z';

export const SOFTWARE_FAIR_BOOTH_COORDINATES: SoftwareFairBoothMapCoordinate[] = [
  { boothNumber: 1, x: 267.5, y: 281.5, rotate: -90 },
  { boothNumber: 2, x: 319.5, y: 282.5, rotate: -90 },
  { boothNumber: 3, x: 374.5, y: 283.5, rotate: -90 },
  { boothNumber: 4, x: 426.5, y: 283.5, rotate: -90 },
  { boothNumber: 5, x: 479.5, y: 283.5, rotate: -90 },
  { boothNumber: 6, x: 534.5, y: 283.5, rotate: -90 },
  { boothNumber: 7, x: 267.5, y: 358.5, rotate: -90 },
  { boothNumber: 8, x: 322.5, y: 358.5, rotate: -90 },
  { boothNumber: 9, x: 374.5, y: 358.5, rotate: -90 },
  { boothNumber: 10, x: 426.5, y: 358.5, rotate: -90 },
  { boothNumber: 11, x: 481.5, y: 358.5, rotate: -90 },
  { boothNumber: 12, x: 536.5, y: 358.5, rotate: -90 },
  { boothNumber: 13, x: 267.5, y: 437.5, rotate: -90 },
  { boothNumber: 14, x: 322.5, y: 437.5, rotate: -90 },
  { boothNumber: 15, x: 374.5, y: 437.5, rotate: -90 },
  { boothNumber: 16, x: 426.5, y: 437.5, rotate: -90 },
  { boothNumber: 17, x: 481.5, y: 437.5, rotate: -90 },
  { boothNumber: 18, x: 536.5, y: 437.5, rotate: -90 },
  { boothNumber: 19, x: 267.5, y: 497.5, rotate: -90 },
  { boothNumber: 20, x: 322.5, y: 497.5, rotate: -90 },
  { boothNumber: 21, x: 374.5, y: 497.5, rotate: -90 },
  { boothNumber: 22, x: 426.5, y: 497.5, rotate: -90 },
  { boothNumber: 23, x: 481.5, y: 497.5, rotate: -90 },
  { boothNumber: 24, x: 536.5, y: 497.5, rotate: -90 },
  { boothNumber: 25, x: 180.5, y: 264.5, rotate: 20 },
  { boothNumber: 26, x: 124.5, y: 320.5, rotate: 20 },
  { boothNumber: 27, x: 178.5, y: 340.5, rotate: 20 },
  { boothNumber: 28, x: 85.5, y: 387.5, rotate: 20 },
  { boothNumber: 29, x: 136.5, y: 404.5, rotate: 20 },
  { boothNumber: 30, x: 186.5, y: 423.5, rotate: 20 },
  { boothNumber: 31, x: 97.9, y: 451.5, rotate: 20 },
  { boothNumber: 32, x: 148.9, y: 468.5, rotate: 20 },
  { boothNumber: 33, x: 198.9, y: 487.5, rotate: 20 },
  { boothNumber: 34, x: 619.5, y: 265.5, rotate: -20 },
  { boothNumber: 35, x: 674.5, y: 324.5, rotate: -20 },
  { boothNumber: 36, x: 626.5, y: 342.5, rotate: -20 },
  { boothNumber: 37, x: 715.5, y: 390.5, rotate: -20 },
  { boothNumber: 38, x: 663.5, y: 409.5, rotate: -20 },
  { boothNumber: 39, x: 613.5, y: 428.5, rotate: -20 },
  { boothNumber: 40, x: 714.5, y: 449.5, rotate: -20 },
  { boothNumber: 41, x: 662.5, y: 468.5, rotate: -20 },
  { boothNumber: 42, x: 612.5, y: 487.5, rotate: -20 },
];

export const SOFTWARE_FAIR_GENRE_COLORS: Record<string, string> = {
  Automotive: '#60A5FA',
  'Behavior Change/Wellness': '#2DD4BF',
  'Business/Office': '#4ADE80',
  Commerce: '#818CF8',
  Education: '#A3E635',
  Finance: '#FB923C',
  Games: '#A855F7',
  Healthcare: '#FACC15',
  Productivity: '#991B1B',
  Research: '#6366F1',
  Security: '#D946EF',
  'Social Media': '#38BDF8',
  XR: '#F59E0B',
  Other: '#78716C',
};
