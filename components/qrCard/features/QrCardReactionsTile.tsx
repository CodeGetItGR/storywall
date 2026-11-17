import { TILE_ACCENT_SOFT, TILE_PAPER, TILE_SIZE } from '@/components/qrCard/features/tileProps';

// Reaction bubbles, as the app's reactions show them. They print in the device's emoji font, like the app.
const BUBBLES = [
    { emoji: '❤️', x: 8, y: 8.5, r: 5.2 },
    { emoji: '😍', x: 18.5, y: 8, r: 4.4 },
    { emoji: '🎉', x: 9.5, y: 19, r: 4.4 },
    { emoji: '😂', x: 18.8, y: 18.5, r: 5 },
];

export function QrCardReactionsTile() {
    return (
        <>
            {/* Card */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill={TILE_PAPER} />
            {/* Bubbles */}
            {BUBBLES.map((bubble) => (
                <g key={bubble.emoji}>
                    <circle cx={bubble.x} cy={bubble.y} r={bubble.r} fill={TILE_ACCENT_SOFT} />
                    <text x={bubble.x} y={bubble.y + bubble.r * 0.38} textAnchor="middle" fontSize={bubble.r * 1.1}>
                        {bubble.emoji}
                    </text>
                </g>
            ))}
        </>
    );
}
