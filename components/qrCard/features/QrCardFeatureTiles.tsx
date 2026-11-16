import type { ReactNode } from 'react';

import { QrCardMusicTile } from '@/components/qrCard/features/QrCardMusicTile';
import { QrCardPostsTile } from '@/components/qrCard/features/QrCardPostsTile';
import { QrCardReactionsTile } from '@/components/qrCard/features/QrCardReactionsTile';
import { QrCardStoriesTile } from '@/components/qrCard/features/QrCardStoriesTile';
import { QrCardWishesTile } from '@/components/qrCard/features/QrCardWishesTile';
import { type QrCardTileProps, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { QR_CARD_FONT } from '@/lib/qrCard';
import { layoutFeatureTiles, QR_CARD_TILE, type QrCardFeature, type QrCardFeatureTexts } from '@/lib/qrCardFeatures';
import type { Rect } from '@/lib/qrCardLayout';

const TILES: Record<QrCardFeature, (props: QrCardTileProps) => ReactNode> = {
    posts: QrCardPostsTile,
    stories: QrCardStoriesTile,
    wishes: QrCardWishesTile,
    reactions: QrCardReactionsTile,
    music: QrCardMusicTile,
};

const LABEL_SIZE = 3.2;

// The tiles in the layout's box: each tilted with a soft shadow, its label straight under it in the
// card's line colour.
export function QrCardFeatureTiles({ features, box, texts, labelColor, ids }: { features: QrCardFeature[]; box: Rect; texts: QrCardFeatureTexts; labelColor: string; ids: string }) {
    const shadow = `${ids}-shadow`;
    return (
        <g>
            <defs>
                <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx={0} dy={0.6} stdDeviation={0.7} floodColor="#000000" floodOpacity={0.22} />
                </filter>
            </defs>
            {layoutFeatureTiles(features, box).map((tile) => {
                const Tile = TILES[tile.feature];
                return (
                    <g key={tile.feature} data-qr-feature={tile.feature} transform={`translate(${tile.x} ${tile.y}) scale(${tile.scale})`}>
                        {/* Tile */}
                        <g transform={`rotate(${tile.tilt} ${TILE_SIZE / 2} ${TILE_SIZE / 2})`} filter={`url(#${shadow})`}>
                            <Tile texts={texts} ids={`${ids}-${tile.feature}`} />
                        </g>
                        {/* Label */}
                        <text x={TILE_SIZE / 2} y={TILE_SIZE + QR_CARD_TILE.label - 0.9} textAnchor="middle" fontSize={LABEL_SIZE} fontFamily={QR_CARD_FONT} fontWeight={700} fill={labelColor}>
                            {texts.labels[tile.feature]}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}
