import { type QrCardTileProps, TILE_ACCENT, TILE_ACCENT_SOFT, TILE_INK, TILE_MUTED, TILE_PAPER, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { fitText, QR_CARD_FONT } from '@/lib/qrCard';

const TIMES = ['18:00', '20:00'];
const ROW_TOPS = [3.6, 13.8];
const ROW_X = 6.8;
const ROW_WIDTH = 17;
const ROW_HEIGHT = 8.6;
const NAME_X = 8;
const NAME_LINE_HEIGHT = 1.2;

// Two schedule rows on a timeline, the first one highlighted. A long name wraps to a second line.
export function QrCardScheduleTile({ texts }: Pick<QrCardTileProps, 'texts'>) {
    return (
        <>
            {/* Card */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill={TILE_PAPER} />
            {/* Timeline */}
            <rect x={4.05} y={7} width={0.7} height={10.4} fill="#E4DCD5" />
            {/* Sessions */}
            {texts.schedule.map((session, index) => {
                const top = ROW_TOPS[index];
                const leading = index === 0;
                const name = fitText(session, { width: 15, maxLines: 2, maxSize: 2, minSize: 1.4, maxHeight: 4.6 });
                const lineHeight = name.fontSize * NAME_LINE_HEIGHT;
                const first = top + (name.lines.length > 1 ? 5 : 5.9);
                return (
                    <g key={index}>
                        <circle cx={4.4} cy={top + 2.4} r={1} fill={leading ? TILE_ACCENT : '#D9CFC7'} />
                        <rect x={ROW_X} y={top} width={ROW_WIDTH} height={ROW_HEIGHT} rx={1.2} fill={leading ? TILE_ACCENT_SOFT : '#F7F4F1'} />
                        <text x={NAME_X} y={top + 2.9} fontSize={2} fontFamily={QR_CARD_FONT} fontWeight={700} fill={leading ? TILE_ACCENT : TILE_MUTED}>
                            {TIMES[index]}
                        </text>
                        <text fontSize={name.fontSize} fontFamily={QR_CARD_FONT} fontWeight={700} fill={TILE_INK}>
                            {name.lines.map((line, row) => (
                                <tspan key={row} x={NAME_X} y={first + row * lineHeight}>
                                    {line}
                                </tspan>
                            ))}
                        </text>
                    </g>
                );
            })}
        </>
    );
}
