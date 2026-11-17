import { type QrCardTileProps, TILE_ACCENT, TILE_INK, TILE_MUTED, TILE_PAPER, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { fitText, QR_CARD_FONT } from '@/lib/qrCard';

const SHARES = [68, 32];
const BAR_X = 2.5;
const BAR_WIDTH = 21;
const BAR_HEIGHT = 4.2;
const BAR_TOPS = [12.5, 18.2];
const LINE_HEIGHT = 1.2;

// A poll result: the sample question, then two answer bars, the leading one filled in the accent.
export function QrCardGamesTile({ texts }: Pick<QrCardTileProps, 'texts'>) {
    const question = fitText(texts.game.question, { width: 21, maxLines: 2, maxSize: 2.3, minSize: 1.6, maxHeight: 7 });
    const lineHeight = question.fontSize * LINE_HEIGHT;
    const first = 7.2 - (question.lines.length * lineHeight) / 2 + question.fontSize * 0.85;
    return (
        <>
            {/* Card */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill={TILE_PAPER} />
            {/* Question */}
            <text x={TILE_SIZE / 2} textAnchor="middle" fontSize={question.fontSize} fontFamily={QR_CARD_FONT} fontWeight={700} fill={TILE_INK}>
                {question.lines.map((line, index) => (
                    <tspan key={index} x={TILE_SIZE / 2} y={first + index * lineHeight}>
                        {line}
                    </tspan>
                ))}
            </text>
            {/* Answers */}
            {texts.game.answers.map((answer, index) => {
                const top = BAR_TOPS[index];
                const leading = index === 0;
                return (
                    <g key={index}>
                        <rect x={BAR_X} y={top} width={BAR_WIDTH} height={BAR_HEIGHT} rx={1.2} fill="#F2EEEA" />
                        <rect x={BAR_X} y={top} width={(BAR_WIDTH * SHARES[index]) / 100} height={BAR_HEIGHT} rx={1.2} fill={leading ? TILE_ACCENT : '#E4DCD5'} />
                        <text x={BAR_X + 1.1} y={top + 2.9} fontSize={2} fontFamily={QR_CARD_FONT} fontWeight={700} fill={leading ? TILE_PAPER : TILE_INK}>
                            {answer}
                        </text>
                        <text x={BAR_X + BAR_WIDTH - 1.1} y={top + 2.9} textAnchor="end" fontSize={2} fontFamily={QR_CARD_FONT} fontWeight={700} fill={leading ? TILE_INK : TILE_MUTED}>
                            {`${SHARES[index]}%`}
                        </text>
                    </g>
                );
            })}
        </>
    );
}
