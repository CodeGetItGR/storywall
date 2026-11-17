import type { EventModuleResponseDto, ModuleKeyConvention } from '@/lib/api/types';
import type { Rect } from '@/lib/qrCardLayout';

// The picture tiles under the event card's code: what guests can do after scanning.
export type QrCardFeature = 'posts' | 'stories' | 'wishes' | 'reactions' | 'music' | 'games' | 'gifts' | 'schedule';

// The words a tile prints, already in the host's language: its label, and the sample text it shows.
export type QrCardFeatureTexts = {
    labels: Record<QrCardFeature, string>;
    wish: string;
    songs: [string, string, string];
    game: { question: string; answers: [string, string] };
    gift: { title: string; copy: string };
    schedule: [string, string];
};

export const QR_CARD_FEATURE_LIMIT = 5;

// In print order: the main five, then the backups that fill free places. A tile shows when the plan makes
// any of its modules available. RSVP never shows.
const FEATURE_RULES: { feature: QrCardFeature; modules: ModuleKeyConvention[] }[] = [
    { feature: 'posts', modules: ['posts', 'gallery'] },
    { feature: 'stories', modules: ['stories'] },
    { feature: 'wishes', modules: ['wishbook'] },
    { feature: 'reactions', modules: ['posts'] },
    { feature: 'music', modules: ['playlist'] },
    { feature: 'games', modules: ['quiz_polls', 'he_or_she'] },
    { feature: 'gifts', modules: ['wishlist'] },
    { feature: 'schedule', modules: ['schedule'] },
];

// What the admin previews show: a full plan.
export const QR_CARD_SAMPLE_FEATURES: QrCardFeature[] = FEATURE_RULES.map((rule) => rule.feature).slice(0, QR_CARD_FEATURE_LIMIT);

export function qrCardFeatures(modules: Pick<EventModuleResponseDto, 'moduleKey' | 'isAvailable'>[]): QrCardFeature[] {
    const available = new Set(modules.filter((module) => module.isAvailable).map((module) => module.moduleKey));
    return FEATURE_RULES.filter((rule) => rule.modules.some((key) => available.has(key)))
        .map((rule) => rule.feature)
        .slice(0, QR_CARD_FEATURE_LIMIT);
}

// A tile draws in a `size` mm square with its label in the `label` mm under it, then scales to fit the box.
export const QR_CARD_TILE = { size: 26, label: 5, gap: 3, rowGap: 2, maxScale: 1.2 } as const;
// Each place's tilt in degrees, like stickers.
const TILTS = [-5, 3, -3, 4, -4];

export type PlacedFeatureTile = { feature: QrCardFeature; x: number; y: number; scale: number; tilt: number };

function rowWidth(count: number): number {
    return count * QR_CARD_TILE.size + (count - 1) * QR_CARD_TILE.gap;
}

// Rows of 3 then 2 (1–3 tiles make one row), each centred, the block centred in the box. All tiles share
// one scale: the largest that fits, up to maxScale.
export function layoutFeatureTiles(features: QrCardFeature[], box: Rect): PlacedFeatureTile[] {
    if (features.length === 0) return [];
    const { size, label, gap, rowGap, maxScale } = QR_CARD_TILE;
    const rows = features.length <= 3 ? [features] : [features.slice(0, 3), features.slice(3)];
    const cellHeight = size + label;
    const contentWidth = Math.max(...rows.map((row) => rowWidth(row.length)));
    const contentHeight = rows.length * cellHeight + (rows.length - 1) * rowGap;
    const scale = Math.min(maxScale, box.width / contentWidth, box.height / contentHeight);
    const top = box.y + (box.height - contentHeight * scale) / 2;
    return rows.flatMap((row, rowIndex) => {
        const left = box.x + (box.width - rowWidth(row.length) * scale) / 2;
        const y = top + rowIndex * (cellHeight + rowGap) * scale;
        return row.map((feature, column) => ({
            feature,
            x: Math.round((left + column * (size + gap) * scale) * 10) / 10,
            y: Math.round(y * 10) / 10,
            scale: Math.round(scale * 1000) / 1000,
            tilt: TILTS[rowIndex * 3 + column],
        }));
    });
}
