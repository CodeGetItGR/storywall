import type { ComponentProps } from 'react';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import type { QrCardSize } from '@/lib/api/types';
import { QR_CARD_CUT_COLOR, QR_CARD_CUT_WIDTH_MM, QR_CARD_ORIENTATIONS, type QrCardCut, qrCardOrientedSheet, type QrCardSheet } from '@/lib/qrCard';

function QrCardCutLines({ cuts, viewBox, orientation }: { cuts: QrCardCut[]; viewBox: string; orientation?: string }) {
    return (
        <svg data-qr-card-cuts={orientation ?? ''} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} aria-hidden="true" className="hidden">
            {cuts.map((cut) => (
                <line key={`${cut.x1}-${cut.y1}-${cut.x2}-${cut.y2}`} {...cut} stroke={QR_CARD_CUT_COLOR} strokeWidth={QR_CARD_CUT_WIDTH_MM} />
            ))}
        </svg>
    );
}

// The rest of an A4 sheet: one more copy of the card per extra slot, and the cut lines over the
// whole sheet. Hidden on screen; QrCardPrintStyle shows and places them when printing. An adaptive
// print has cut lines for each orientation, each drawn over its grid of cards.
export function QrCardPrintCopies({
    sheet,
    size,
    adaptive,
    card,
}: {
    sheet: QrCardSheet;
    size: QrCardSize;
    adaptive: boolean;
    card: Omit<ComponentProps<typeof QrCardSvg>, 'ref' | 'className'>;
}) {
    return (
        <>
            {/* Copies */}
            {sheet.cards.slice(1).map((slot) => (
                <QrCardSvg key={`${slot.x}-${slot.y}`} {...card} className="hidden" />
            ))}
            {/* Cut lines */}
            {adaptive ? (
                QR_CARD_ORIENTATIONS.map((orientation) => {
                    const { cards, cuts, columns, rows, cellWidthMm, cellHeightMm } = qrCardOrientedSheet(size, orientation);
                    const viewBox = `${cards[0].x} ${cards[0].y} ${columns * cellWidthMm} ${rows * cellHeightMm}`;
                    return <QrCardCutLines key={orientation} cuts={cuts} viewBox={viewBox} orientation={orientation} />;
                })
            ) : (
                <QrCardCutLines cuts={sheet.cuts} viewBox={`0 0 ${sheet.widthMm} ${sheet.heightMm}`} />
            )}
        </>
    );
}
