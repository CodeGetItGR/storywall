import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QrCardPrintStyle } from '@/components/qrCard/QrCardPrintStyle';
import { qrCardSheet } from '@/lib/qrCard';

function css(...args: Parameters<typeof QrCardPrintStyle>) {
    const { container } = render(<QrCardPrintStyle {...args[0]} />);
    return container.querySelector('style')?.textContent ?? '';
}

describe('QrCardPrintStyle', () => {
    it('asks for the exact page of one card', () => {
        expect(css({ size: 'A6', sheet: null, adaptive: false })).toContain('@page{size:105mm 148mm;margin:0}');
    });

    it('asks for the exact page of a sheet', () => {
        expect(css({ size: 'A5', sheet: qrCardSheet('A5'), adaptive: false })).toContain('@page{size:297mm 210mm;margin:0}');
    });

    it('leaves the page to the print dialog when adaptive', () => {
        for (const sheet of [null, qrCardSheet('A5')]) {
            const printed = css({ size: 'A5', sheet, adaptive: true });

            expect(printed).toContain('@page{margin:0}');
            expect(printed).not.toContain('@page{size');
        }
    });

    it('lays an adaptive sheet out for each orientation, showing only its own cut lines', () => {
        const printed = css({ size: 'A5', sheet: qrCardSheet('A5'), adaptive: true });

        expect(printed).toContain('@media print and (orientation:portrait)');
        expect(printed).toContain('@media print and (orientation:landscape)');
        const [, portrait, landscape] = printed.split(/@media print and \(orientation:\w+\)/);
        expect(portrait).toContain('svg[data-qr-card-cuts="landscape"]{display:none!important}');
        expect(landscape).toContain('svg[data-qr-card-cuts="portrait"]{display:none!important}');
    });

    it('turns only the cards of the orientation that needs it', () => {
        const printed = css({ size: 'A5', sheet: qrCardSheet('A5'), adaptive: true });
        const [, portrait, landscape] = printed.split(/@media print and \(orientation:\w+\)/);

        expect(portrait).toContain('rotate(90deg)');
        expect(landscape).not.toContain('rotate(90deg)');
    });

    it('shrinks an adaptive card only when the paper is too small', () => {
        expect(css({ size: 'A6', sheet: null, adaptive: true })).toContain('min(1mm,calc(100vw / 105),calc(100vh / 148))');
    });

    it('never turns a single adaptive card', () => {
        expect(css({ size: 'A5', sheet: null, adaptive: true })).not.toContain('rotate(');
    });
});
