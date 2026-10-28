import { describe, expect, it } from 'vitest';

import type { QrCardTemplateDto } from '@/lib/api/types';
import {
    estimateTextWidth,
    fitText,
    giftQrCardLines,
    layoutLines,
    layoutTitle,
    PLAIN_QR_CARD_STYLE,
    QR_CARD_LAYOUT,
    QR_CARD_LINE_BOXES,
    QR_CARD_LINE_KEYS,
    QR_CARD_TITLE_BOX,
    qrCardFileName,
    qrCardStyleOf,
} from '@/lib/qrCard';

describe('fitText', () => {
    it('keeps a short title at the largest size, on one line', () => {
        expect(fitText('Anna & Nikos', QR_CARD_TITLE_BOX)).toEqual({ lines: ['Anna & Nikos'], fontSize: 9 });
    });

    it('shrinks a long title until it fits on two lines', () => {
        expect(fitText('Μαρία Παπαδοπούλου & Νικόλαος Αλεξανδρόπουλος', QR_CARD_TITLE_BOX)).toEqual({
            lines: ['Μαρία Παπαδοπούλου &', 'Νικόλαος Αλεξανδρόπουλος'],
            fontSize: 6,
        });
    });

    it('breaks a word too long for one line', () => {
        const fitted = fitText('x'.repeat(60), QR_CARD_LINE_BOXES.body);
        expect(fitted.lines.length).toBeLessThanOrEqual(2);
        expect(fitted.lines.join('')).toBe('x'.repeat(60));
    });

    it('ends on an ellipsis when even the smallest size runs over', () => {
        const fitted = fitText('word '.repeat(80), QR_CARD_LINE_BOXES.body);
        expect(fitted.fontSize).toBe(3.5);
        expect(fitted.lines).toHaveLength(2);
        expect(fitted.lines[1].endsWith('…')).toBe(true);
    });

    it.each(['Anna & Nikos', 'ΒΑΠΤΙΣΗ ΤΗΣ ΕΛΕΝΗΣ ΚΑΙ ΤΟΥ ΓΙΩΡΓΟΥ', 'W'.repeat(40)])('never estimates a line wider than the box: %s', (title) => {
        const fitted = fitText(title, QR_CARD_TITLE_BOX);
        for (const line of fitted.lines) expect(estimateTextWidth(line, fitted.fontSize)).toBeLessThanOrEqual(QR_CARD_TITLE_BOX.width);
    });

    it('draws nothing for blank text', () => {
        expect(fitText('   ', QR_CARD_TITLE_BOX).lines).toEqual([]);
    });
});

describe('layoutTitle', () => {
    it('centres the title in its band', () => {
        expect(layoutTitle('Anna & Nikos')).toEqual({ lines: ['Anna & Nikos'], fontSize: 9, baselines: [25.34] });
    });
});

describe('layoutLines', () => {
    it('keeps the full gift card stack inside the band', () => {
        const placed = layoutLines([
            { text: 'Scan to claim your gift and enjoy it with everyone you love', tone: 'body' },
            { text: 'PIN: 4821 9934', tone: 'code' },
            { text: 'Or sign in with a.very.long.address@example-mail.com', tone: 'small' },
            { text: 'With love from the whole Papadopoulos family', tone: 'strong' },
        ]);
        const { top, bottom } = QR_CARD_LAYOUT.lines;
        expect(placed.map((line) => line.tone)).toEqual(['body', 'code', 'small', 'strong']);
        for (const line of placed) {
            expect(line.baselines[0] - 0.86 * line.fontSize).toBeGreaterThanOrEqual(top - 0.01);
            expect(line.baselines[line.baselines.length - 1] + 0.34 * line.fontSize).toBeLessThanOrEqual(bottom + 0.01);
        }
    });

    it('leaves out empty lines', () => {
        expect(layoutLines([{ text: '  ', tone: 'body' }, { text: 'Eleni', tone: 'strong' }]).map((line) => line.tone)).toEqual(['strong']);
    });
});

describe('default lines', () => {
    it('picks the line by what the QR opens', () => {
        expect(QR_CARD_LINE_KEYS).toEqual({ EVENT_JOIN: 'join', INVITATION: 'invitation', MEDIA_UPLOAD: 'gallery' });
    });

    it('stacks the gift card lines, leaving out a missing PIN or email', () => {
        expect(giftQrCardLines({ line: 'Scan', pin: 'PIN: 1234', email: null, giver: 'Eleni' })).toEqual([
            { text: 'Scan', tone: 'body' },
            { text: 'PIN: 1234', tone: 'code' },
            { text: 'Eleni', tone: 'strong' },
        ]);
    });
});

describe('qrCardFileName', () => {
    it.each([
        ['Maria & Nikos', 'png', 'Maria-&-Nikos.png'],
        ['Τραπέζι 4: κήπος?', 'png', 'Τραπέζι-4-κήπος.png'],
        ['   ', 'pdf', 'storywall-qr.pdf'],
    ] as const)('names %s', (title, extension, expected) => {
        expect(qrCardFileName(title, extension)).toBe(expected);
    });
});

describe('qrCardStyleOf', () => {
    it("takes a template's look", () => {
        const template: QrCardTemplateDto = {
            id: 't1',
            name: { en: 'Linen', el: 'Λινό' },
            artworkUrl: '/api/qr-card-artwork/t1/1',
            textColor: '#5A3E2B',
            headingFont: null,
            codeColor: '#1F3A5A',
            dotShape: 'DOT',
            cornerShape: 'CIRCLE',
            centerLogo: false,
        };
        expect(qrCardStyleOf(template)).toEqual({
            id: 't1',
            artworkUrl: '/api/qr-card-artwork/t1/1',
            textColor: '#5A3E2B',
            headingFont: null,
            codeColor: '#1F3A5A',
            dotShape: 'DOT',
            cornerShape: 'CIRCLE',
            centerLogo: false,
        });
    });

    it('keeps Plain as today’s look', () => {
        expect(PLAIN_QR_CARD_STYLE).toMatchObject({ artworkUrl: null, codeColor: '#241F1A', dotShape: 'SQUARE', cornerShape: 'SQUARE', centerLogo: true });
    });
});
