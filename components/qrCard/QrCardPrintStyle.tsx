// While the card is on screen, a print is one A6 page holding just the card, edge to edge. The
// global print rules (app/globals.css) already hide everything outside [data-print-root] and make
// its ancestors plain blocks; these also zero the page margins and those ancestors' padding, which
// would otherwise push the card onto a second page.
const PRINT_CSS =
    '@page{size:105mm 148mm;margin:0}' +
    '@media print{' +
    'html,body{margin:0!important;padding:0!important}' +
    'body :has([data-qr-card-print]){margin:0!important;padding:0!important;border:0!important;gap:0!important;min-height:0!important;max-width:none!important}' +
    '[data-qr-card-print]{width:105mm!important;height:148mm!important;max-width:none!important;margin:0!important;border-radius:0!important;box-shadow:none!important}' +
    '[data-qr-card-print] svg{display:block;width:105mm;height:148mm}' +
    '}';

export function QrCardPrintStyle() {
    return <style>{PRINT_CSS}</style>;
}
