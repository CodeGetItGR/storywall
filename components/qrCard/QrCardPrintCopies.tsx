import type { ComponentProps } from 'react';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { QR_CARD_CUT_COLOR, QR_CARD_CUT_WIDTH_MM, type QrCardSheet } from '@/lib/qrCard';

// The rest of an A4 sheet: one more copy of the card per extra slot, and the cut lines over the
// whole sheet. Hidden on screen; QrCardPrintStyle shows and places them when printing.
export function QrCardPrintCopies({ sheet, card }: { sheet: QrCardSheet; card: Omit<ComponentProps<typeof QrCardSvg>, 'ref' | 'className'> }) {
    return (
        <>
            {/* Copies */}
            {sheet.cards.slice(1).map((slot) => (
                <QrCardSvg key={`${slot.x}-${slot.y}`} {...card} className="hidden" />
            ))}
            {/* Cut lines */}
            <svg
                data-qr-card-cuts
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`0 0 ${sheet.widthMm} ${sheet.heightMm}`}
                aria-hidden="true"
                className="hidden"
            >
                {sheet.cuts.map((cut) => (
                    <line key={`${cut.x1}-${cut.y1}-${cut.x2}-${cut.y2}`} {...cut} stroke={QR_CARD_CUT_COLOR} strokeWidth={QR_CARD_CUT_WIDTH_MM} />
                ))}
            </svg>
        </>
    );
}
