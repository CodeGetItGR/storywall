import { type QrCardTileProps, TILE_ACCENT, TILE_ACCENT_SOFT, TILE_INK, TILE_MUTED, TILE_PAPER, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { fitText, QR_CARD_FONT } from '@/lib/qrCard';

// A sample account number, masked like the money-gift card shows it.
const IBAN = 'GR16 0110 •••• 7095';
const MONO = "'Courier New', monospace";
const LINE_HEIGHT = 1.2;

// The money-gift card: a small gift box, what the gift is for, the masked IBAN and a copy button.
export function QrCardGiftsTile({ texts }: Pick<QrCardTileProps, 'texts'>) {
    const title = fitText(texts.gift.title, { width: 19, maxLines: 2, maxSize: 2.3, minSize: 1.6, maxHeight: 6 });
    const lineHeight = title.fontSize * LINE_HEIGHT;
    const first = 12 - (title.lines.length * lineHeight) / 2 + title.fontSize * 0.85;
    const copy = fitText(texts.gift.copy, { width: 9.4, maxLines: 1, maxSize: 1.9, minSize: 1.4 });
    return (
        <>
            {/* Card */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill={TILE_PAPER} />
            <rect x={2} y={2} width={22} height={22} rx={1.6} fill={TILE_ACCENT_SOFT} />
            {/* Gift box */}
            <rect x={10.3} y={3.6} width={5.4} height={4.2} rx={0.6} fill={TILE_ACCENT} />
            <rect x={12.6} y={3.6} width={0.8} height={4.2} fill={TILE_PAPER} />
            <rect x={10} y={4.9} width={6} height={0.8} fill={TILE_PAPER} />
            {/* Title */}
            <text x={TILE_SIZE / 2} textAnchor="middle" fontSize={title.fontSize} fontFamily={QR_CARD_FONT} fontWeight={700} fill={TILE_INK}>
                {title.lines.map((line, index) => (
                    <tspan key={index} x={TILE_SIZE / 2} y={first + index * lineHeight}>
                        {line}
                    </tspan>
                ))}
            </text>
            {/* Account */}
            <text x={TILE_SIZE / 2} y={17} textAnchor="middle" fontSize={1.75} fontFamily={MONO} fill={TILE_MUTED}>
                {IBAN}
            </text>
            {/* Copy */}
            <rect x={7.5} y={18.8} width={11} height={3.6} rx={1.8} fill={TILE_ACCENT} />
            <text x={TILE_SIZE / 2} y={21.2} textAnchor="middle" fontSize={copy.fontSize} fontFamily={QR_CARD_FONT} fontWeight={700} fill={TILE_PAPER}>
                {copy.lines[0]}
            </text>
        </>
    );
}
