import { type QrCardTileProps, TILE_INK, TILE_SERIF, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { fitText } from '@/lib/qrCard';

const LINE_HEIGHT = 1.25;

// A note card with the sample wish in italic serif, centred.
export function QrCardWishesTile({ texts }: Pick<QrCardTileProps, 'texts'>) {
    const wish = fitText(texts.wish, { width: 20, maxLines: 4, maxSize: 3.2, minSize: 2, maxHeight: 18 });
    const lineHeight = wish.fontSize * LINE_HEIGHT;
    const first = TILE_SIZE / 2 - (wish.lines.length * lineHeight) / 2 + wish.fontSize * 0.85;
    return (
        <>
            {/* Card */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill="#FFFDF8" />
            {/* Wish */}
            <text x={TILE_SIZE / 2} textAnchor="middle" fontSize={wish.fontSize} fontFamily={TILE_SERIF} fontStyle="italic" fill={TILE_INK}>
                {wish.lines.map((line, index) => (
                    <tspan key={index} x={TILE_SIZE / 2} y={first + index * lineHeight}>
                        {line}
                    </tspan>
                ))}
            </text>
        </>
    );
}
