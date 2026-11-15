import { type QrCardTileProps, TILE_ACCENT, TILE_ACCENT_SOFT, TILE_INK, TILE_MUTED, TILE_PAPER, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { fitText, QR_CARD_FONT } from '@/lib/qrCard';
import { QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

const VOTES = [12, 9, 7];
const ROW_TOP = 3;
const ROW_STEP = 7.4;
const ROW_HEIGHT = 6.4;

// A short playlist: three songs with cover thumbnails and vote pills, the top one highlighted.
export function QrCardMusicTile({ texts }: Pick<QrCardTileProps, 'texts'>) {
    return (
        <>
            {/* Card */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill={TILE_PAPER} />
            {/* Songs */}
            {texts.songs.map((song, index) => {
                const top = ROW_TOP + index * ROW_STEP;
                const leading = index === 0;
                const title = fitText(song, { width: 10.6, maxLines: 1, maxSize: 2.4, minSize: 1.6 });
                return (
                    <g key={index}>
                        {leading && <rect x={1.6} y={top} width={22.8} height={ROW_HEIGHT} rx={1.2} fill={TILE_ACCENT_SOFT} />}
                        <image href={QR_JOIN_PREVIEW_IMAGES.photos[1]} x={2.4} y={top + 0.9} width={4.6} height={4.6} preserveAspectRatio="xMidYMid slice" />
                        <text x={8} y={top + 4} fontSize={title.fontSize} fontFamily={QR_CARD_FONT} fontWeight={700} fill={TILE_INK}>
                            {title.lines[0] ?? ''}
                        </text>
                        <rect x={19.2} y={top + 1.5} width={4.4} height={3.4} rx={1.7} fill={leading ? TILE_ACCENT : '#F2EEEA'} />
                        <text x={21.4} y={top + 3.95} textAnchor="middle" fontSize={2.2} fontFamily={QR_CARD_FONT} fontWeight={700} fill={leading ? TILE_PAPER : TILE_MUTED}>
                            {VOTES[index]}
                        </text>
                    </g>
                );
            })}
        </>
    );
}
