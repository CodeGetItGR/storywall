import { TILE_INK, TILE_PAPER, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { QR_CARD_FONT } from '@/lib/qrCard';
import { QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

// A 24-unit heart (Material "favorite").
const HEART =
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

// A guest photo in a polaroid frame, with a heart count under it.
export function QrCardPostsTile() {
    return (
        <>
            {/* Frame */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill={TILE_PAPER} />
            {/* Photo */}
            <image href={QR_JOIN_PREVIEW_IMAGES.post} x={1.8} y={1.8} width={22.4} height={17.4} preserveAspectRatio="xMidYMid slice" />
            {/* Likes */}
            <path d={HEART} transform="translate(2.2 20.6) scale(0.15)" fill="#E8466C" />
            <text x={6.3} y={23.6} fontSize={2.6} fontFamily={QR_CARD_FONT} fontWeight={700} fill={TILE_INK}>
                24
            </text>
        </>
    );
}
