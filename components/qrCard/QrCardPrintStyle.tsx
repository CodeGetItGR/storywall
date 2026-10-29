import type { QrCardSize } from '@/lib/api/types';
import { QR_CARD_SIZES } from '@/lib/qrCard';

// While the card is on screen, a print is one page of the chosen size holding just the card, edge to
// edge. The global print rules (app/globals.css) already hide everything outside [data-print-root]
// and make its ancestors plain blocks; these also zero the page margins and those ancestors'
// padding, which would otherwise push the card onto a second page.
function printCss({ widthMm, heightMm }: { widthMm: number; heightMm: number }): string {
    return (
        `@page{size:${widthMm}mm ${heightMm}mm;margin:0}` +
        '@media print{' +
        'html,body{margin:0!important;padding:0!important}' +
        'body :has([data-qr-card-print]){margin:0!important;padding:0!important;border:0!important;gap:0!important;min-height:0!important;max-width:none!important}' +
        `[data-qr-card-print]{width:${widthMm}mm!important;height:${heightMm}mm!important;max-width:none!important;margin:0!important;border-radius:0!important;box-shadow:none!important}` +
        `[data-qr-card-print] svg{display:block;width:${widthMm}mm;height:${heightMm}mm}` +
        '}'
    );
}

export function QrCardPrintStyle({ size }: { size: QrCardSize }) {
    return <style>{printCss(QR_CARD_SIZES[size])}</style>;
}
