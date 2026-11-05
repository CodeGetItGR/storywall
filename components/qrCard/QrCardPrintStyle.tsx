import type { QrCardSize } from '@/lib/api/types';
import { QR_CARD_SIZES, type QrCardSheet } from '@/lib/qrCard';

// The global print rules (app/globals.css) already hide everything outside [data-print-root] and
// make its ancestors plain blocks; these also zero the page margins and those ancestors' padding,
// which would otherwise push the card onto a second page.
const RESET_CSS =
    'html,body{margin:0!important;padding:0!important}' +
    'body :has([data-qr-card-print]){margin:0!important;padding:0!important;border:0!important;gap:0!important;min-height:0!important;max-width:none!important}';

// One page of the chosen size holding just the card, edge to edge.
function cardCss({ widthMm, heightMm }: { widthMm: number; heightMm: number }): string {
    return (
        `@page{size:${widthMm}mm ${heightMm}mm;margin:0}` +
        '@media print{' +
        RESET_CSS +
        `[data-qr-card-print]{width:${widthMm}mm!important;height:${heightMm}mm!important;max-width:none!important;margin:0!important;border-radius:0!important;box-shadow:none!important}` +
        `[data-qr-card-print] svg{display:block;width:${widthMm}mm;height:${heightMm}mm}` +
        '}'
    );
}

// One A4 page with the cards in a grid at true size (the card and QrCardPrintCopies) and the cut
// lines laid over the whole sheet.
function sheetCss(sheet: QrCardSheet): string {
    const left = sheet.cards[0].x;
    const top = sheet.cards[0].y;
    return (
        `@page{size:${sheet.widthMm}mm ${sheet.heightMm}mm;margin:0}` +
        '@media print{' +
        RESET_CSS +
        `[data-qr-card-print]{position:relative!important;display:grid!important;grid-template-columns:repeat(${sheet.columns},${sheet.cardWidthMm}mm);grid-auto-rows:${sheet.cardHeightMm}mm;align-content:start;box-sizing:border-box;padding:${top}mm 0 0 ${left}mm!important;width:${sheet.widthMm}mm!important;height:${sheet.heightMm}mm!important;max-width:none!important;margin:0!important;border-radius:0!important;box-shadow:none!important}` +
        `[data-qr-card-print]>svg{display:block!important;width:${sheet.cardWidthMm}mm;height:${sheet.cardHeightMm}mm}` +
        `[data-qr-card-print]>svg[data-qr-card-cuts]{position:absolute;inset:0;width:${sheet.widthMm}mm;height:${sheet.heightMm}mm}` +
        '}'
    );
}

export function QrCardPrintStyle({ size, sheet }: { size: QrCardSize; sheet: QrCardSheet | null }) {
    return <style>{sheet ? sheetCss(sheet) : cardCss(QR_CARD_SIZES[size])}</style>;
}
