import React from 'react';
import Svg, { ClipPath, Defs, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import {
  SOFTWARE_FAIR_BOOTH_COORDINATES,
  SOFTWARE_FAIR_GENRE_COLORS,
  SOFTWARE_FAIR_MAP_VIEWBOX,
  SOFTWARE_FAIR_ROOM_PATH,
} from '@/lib/software-fair-map-layout';

export type SoftwareFairBoothMapItem = {
  boothNumber: number;
  genres?: string[];
};

type Props = {
  booths: SoftwareFairBoothMapItem[];
  width: number;
  height: number;
  accessibilityLabel: string;
  highlightedBoothNumber?: number | null;
  onBoothPress?: (boothNumber: number) => void;
  selectedBoothNumber?: number | null;
  selectedGenre?: string | null;
  showAllBoothNumbers?: boolean;
};

const TABLE_WIDTH = 55;
const TABLE_HEIGHT = 35;
const HIT_WIDTH = 72;
const HIT_HEIGHT = 52;

function normalizeGenre(value: string | undefined) {
  if (!value) return 'Other';
  return value.trim() || 'Other';
}

export function softwareFairColorForGenres(genres: string[] | undefined) {
  const primaryGenre = normalizeGenre(genres?.[0]);
  return SOFTWARE_FAIR_GENRE_COLORS[primaryGenre] ?? SOFTWARE_FAIR_GENRE_COLORS.Other;
}

export function softwareFairBoothMatchesGenre(
  booth: SoftwareFairBoothMapItem,
  selectedGenre: string | null
) {
  if (!selectedGenre) return true;
  const normalizedSelected = normalizeGenre(selectedGenre).toLowerCase();
  return (booth.genres ?? []).some(
    (genre) => normalizeGenre(genre).toLowerCase() === normalizedSelected
  );
}

function contrastTextColor(hexColor: string) {
  const raw = hexColor.replace('#', '');
  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? '#111827' : '#FFFFFF';
}

function buildBoothMap(booths: SoftwareFairBoothMapItem[]) {
  return new Map(booths.map((booth) => [booth.boothNumber, booth]));
}

export function SoftwareFairBoothMapSvg({
  booths,
  width,
  height,
  accessibilityLabel,
  highlightedBoothNumber = null,
  onBoothPress,
  selectedBoothNumber = null,
  selectedGenre = null,
  showAllBoothNumbers = false,
}: Props) {
  const boothByNumber = React.useMemo(() => buildBoothMap(booths), [booths]);
  const visibleCoordinates = React.useMemo(
    () =>
      showAllBoothNumbers
        ? SOFTWARE_FAIR_BOOTH_COORDINATES
        : SOFTWARE_FAIR_BOOTH_COORDINATES.filter((coordinate) =>
            boothByNumber.has(coordinate.boothNumber)
          ),
    [boothByNumber, showAllBoothNumbers]
  );

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`${SOFTWARE_FAIR_MAP_VIEWBOX.x} ${SOFTWARE_FAIR_MAP_VIEWBOX.y} ${SOFTWARE_FAIR_MAP_VIEWBOX.width} ${SOFTWARE_FAIR_MAP_VIEWBOX.height}`}
      accessibilityLabel={accessibilityLabel}>
      <Defs>
        <ClipPath id="software-fair-room-clip">
          <Path d={SOFTWARE_FAIR_ROOM_PATH} />
        </ClipPath>
      </Defs>

      <Rect
        x={SOFTWARE_FAIR_MAP_VIEWBOX.x}
        y={SOFTWARE_FAIR_MAP_VIEWBOX.y}
        width={SOFTWARE_FAIR_MAP_VIEWBOX.width}
        height={SOFTWARE_FAIR_MAP_VIEWBOX.height}
        fill="#F4F5F7"
      />
      <G clipPath="url(#software-fair-room-clip)">
        <Path d={SOFTWARE_FAIR_ROOM_PATH} fill="#FAFBFC" />
        <G opacity={0.42}>
          <Rect
            x={68}
            y={366.5}
            width={164}
            height={11}
            fill="#94A3B8"
            transform="rotate(20 150 372)"
          />
          <Rect
            x={66.85}
            y={507.5}
            width={164}
            height={11}
            fill="#94A3B8"
            transform="rotate(20 148.85 513)"
          />
          <Rect
            x={103}
            y={295.5}
            width={135.5}
            height={11}
            fill="#94A3B8"
            transform="rotate(20 170.75 301)"
          />
          <Rect x={235} y={319} width={337} height={11} fill="#94A3B8" />
          <Rect x={225} y={393.5} width={367} height={11} fill="#94A3B8" />
          <Rect x={225} y={536.5} width={347} height={11} fill="#94A3B8" />
          <Rect
            x={564}
            y={296.5}
            width={135.5}
            height={11}
            fill="#94A3B8"
            transform="rotate(-20 631.75 302)"
          />
          <Rect
            x={582}
            y={370.5}
            width={135.5}
            height={11}
            fill="#94A3B8"
            transform="rotate(-20 649.75 376)"
          />
          <Rect
            x={563.71}
            y={502.18}
            width={192.1}
            height={11}
            fill="#94A3B8"
            transform="rotate(-20 659.76 507.68)"
          />
          <Rect
            x={421}
            y={382.5}
            width={305}
            height={11}
            fill="#94A3B8"
            transform="rotate(-90 573.5 388)"
          />
          <Rect
            x={77.85}
            y={386.5}
            width={305}
            height={11}
            fill="#94A3B8"
            transform="rotate(-90 230.35 392)"
          />
        </G>
        <Rect
          x={142}
          y={94}
          width={540}
          height={58}
          fill="#EEF1F5"
          stroke="#CBD5E1"
          strokeWidth={1}
          rx={6}
        />
        <SvgText x={412} y={126} textAnchor="middle" fill="#64748B" fontSize={12} fontWeight="700">
          STAGE
        </SvgText>
      </G>
      <Path
        d={SOFTWARE_FAIR_ROOM_PATH}
        fill="none"
        stroke="#CBD5E1"
        strokeWidth={2}
        strokeLinejoin="miter"
      />

      {visibleCoordinates.map((coordinate) => {
        const booth = boothByNumber.get(coordinate.boothNumber);
        const isAssigned = booth != null;
        const isHighlighted = highlightedBoothNumber === coordinate.boothNumber;
        const isSelected = selectedBoothNumber === coordinate.boothNumber;
        const matchesSelectedGenre = booth
          ? softwareFairBoothMatchesGenre(booth, selectedGenre)
          : false;
        const isMutedByGenre = selectedGenre != null && !matchesSelectedGenre;
        const isMutedByHighlight = highlightedBoothNumber != null && !isHighlighted;
        const isMuted = !isAssigned || isMutedByGenre || isMutedByHighlight;
        const fill = isMuted ? '#E2E8F0' : softwareFairColorForGenres(booth?.genres);
        const textFill = isMuted ? '#64748B' : contrastTextColor(fill);
        const stroke =
          isSelected || isHighlighted ? '#111827' : isMuted ? '#CBD5E1' : 'rgba(255,255,255,0.65)';

        return (
          <G
            key={coordinate.boothNumber}
            opacity={isMuted ? 0.45 : 1}
            onPress={onBoothPress ? () => onBoothPress(coordinate.boothNumber) : undefined}>
            <G
              transform={`translate(${coordinate.x} ${coordinate.y}) rotate(${coordinate.rotate})`}>
              {onBoothPress ? (
                <Rect
                  x={-HIT_WIDTH / 2}
                  y={-HIT_HEIGHT / 2}
                  width={HIT_WIDTH}
                  height={HIT_HEIGHT}
                  fill="transparent"
                />
              ) : null}
              <Rect
                x={-TABLE_WIDTH / 2}
                y={-TABLE_HEIGHT / 2}
                width={TABLE_WIDTH}
                height={TABLE_HEIGHT}
                rx={5}
                fill={fill}
                stroke={stroke}
                strokeWidth={isSelected || isHighlighted ? 4 : isMuted ? 1 : 1.5}
              />
            </G>
            <SvgText
              x={coordinate.x}
              y={coordinate.y + 1}
              textAnchor="middle"
              fill={textFill}
              fontSize={16}
              fontWeight="700">
              {String(coordinate.boothNumber)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
