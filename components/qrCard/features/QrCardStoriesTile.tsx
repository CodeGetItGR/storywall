import { type QrCardTileProps, TILE_ACCENT, TILE_PAPER } from '@/components/qrCard/features/tileProps';
import { QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

const BARS = [7, 11.1, 15.2];

// A tall story frame: a sunset photo, progress bars along the top and a ringed profile picture.
export function QrCardStoriesTile({ ids }: Pick<QrCardTileProps, 'ids'>) {
    const photoClip = `${ids}-story`;
    const ringClip = `${ids}-ring`;
    return (
        <>
            <defs>
                <clipPath id={photoClip}>
                    <rect x={6} y={1} width={14} height={24} rx={1.4} />
                </clipPath>
                <clipPath id={ringClip}>
                    <circle cx={9.2} cy={5.8} r={1.9} />
                </clipPath>
            </defs>
            {/* Frame */}
            <rect x={5} width={16} height={26} rx={2} fill={TILE_PAPER} />
            {/* Photo */}
            <image href={QR_JOIN_PREVIEW_IMAGES.photos[0]} x={6} y={1} width={14} height={24} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${photoClip})`} />
            {/* Progress */}
            {BARS.map((x, index) => (
                <rect key={x} x={x} y={2} width={3.8} height={0.5} rx={0.25} fill={TILE_PAPER} opacity={index === 0 ? 1 : 0.5} />
            ))}
            {/* Profile */}
            <circle cx={9.2} cy={5.8} r={2.3} fill="none" stroke={TILE_ACCENT} strokeWidth={0.5} />
            <image href={QR_JOIN_PREVIEW_IMAGES.stories[0]} x={7.3} y={3.9} width={3.8} height={3.8} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${ringClip})`} />
        </>
    );
}
