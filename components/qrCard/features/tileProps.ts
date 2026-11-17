import type { QrCardFeatureTexts } from '@/lib/qrCardFeatures';

// What every tile gets: the card's translated sample text, and a prefix for its clip-path ids.
export type QrCardTileProps = { texts: QrCardFeatureTexts; ids: string };

export const TILE_SIZE = 26;
export const TILE_PAPER = '#FFFFFF';
export const TILE_INK = '#1F1A17';
export const TILE_MUTED = '#5B514B';
export const TILE_ACCENT = '#F0645A';
export const TILE_ACCENT_SOFT = '#FFF1EC';
export const TILE_SERIF = "Georgia, 'Times New Roman', serif";
