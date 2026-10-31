import { describe, expect, it } from 'vitest';

import type { QrCardTemplateDto } from '@/lib/api/types';
import {
    estimateTextWidth,
    fitText,
    giftQrCardLines,
    layoutLines,
    layoutTitle,
    PLAIN_QR_CARD_STYLE,
    QR_CARD_LINE_BOXES,
    QR_CARD_LINE_KEYS,
    QR_CARD_SIZES,
    QR_CARD_TITLE_BOX,
    qrCardFileName,
    qrCardStyleOf,
} from '@/lib/qrCard';
import { DEFAULT_QR_CARD_LAYOUT } from '@/lib/qrCardLayout';

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

    it.each(['ΑΛΕΞΑΝΔΡΟΠΟΥΛΟΣ', 'Παπαδοπούλου-Αλεξανδρόπουλου'])('shrinks the long word %s instead of splitting it', (word) => {
        const fitted = fitText(word, QR_CARD_TITLE_BOX);
        expect(fitted.lines).toEqual([word]);
        expect(fitted.fontSize).toBeLessThan(QR_CARD_TITLE_BOX.maxSize);
        expect(fitted.fontSize).toBeGreaterThanOrEqual(QR_CARD_TITLE_BOX.minSize);
    });

    it('keeps words whole while a smaller size makes them fit, and only breaks them at the smallest size', () => {
        expect(fitText('Anna ΑΛΕΞΑΝΔΡΟΠΟΥΛΟΣ', QR_CARD_TITLE_BOX).lines).toEqual(['Anna', 'ΑΛΕΞΑΝΔΡΟΠΟΥΛΟΣ']);
        const broken = fitText('Χ'.repeat(40), QR_CARD_TITLE_BOX);
        expect(broken.fontSize).toBe(QR_CARD_TITLE_BOX.minSize);
        expect(broken.lines.length).toBeGreaterThan(1);
        expect(broken.lines.join('')).toBe('Χ'.repeat(40));
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

    it.each(['MW'.repeat(10), 'ΜΩ'.repeat(10), 'ΟΦΨΜΩ'.repeat(4), 'm&w@'.repeat(8)])('fits wide bold glyphs inside the text width: %s', (title) => {
        const fitted = fitText(title, QR_CARD_TITLE_BOX);
        expect(fitted.lines.length).toBeLessThanOrEqual(QR_CARD_TITLE_BOX.maxLines);
        for (const line of fitted.lines) expect(estimateTextWidth(line, fitted.fontSize)).toBeLessThanOrEqual(QR_CARD_TITLE_BOX.width);
    });

    it('draws nothing for blank text', () => {
        expect(fitText('   ', QR_CARD_TITLE_BOX).lines).toEqual([]);
    });
});

// Advance widths of bold Arial as a share of the font size.
const BOLD_ARIAL_EM = {
    M: 0.833,
    W: 0.944,
    O: 0.778,
    G: 0.778,
    Q: 0.778,
    m: 0.889,
    w: 0.778,
    '&': 0.722,
    '@': 0.975,
    Μ: 0.833,
    Ο: 0.778,
    Ω: 0.8,
    Φ: 0.778,
    Ψ: 0.778,
    ω: 0.778,
};

describe('estimateTextWidth', () => {
    it.each(Object.entries(BOLD_ARIAL_EM))('is no narrower than bold Arial for %s', (char, em) => {
        expect(estimateTextWidth(char.repeat(10), 1)).toBeGreaterThanOrEqual(em * 10);
    });

    it('is no narrower than bold Arial for wide strings', () => {
        for (const text of ['MWMWMW', 'ΜΩΜΩΜΩ', 'Mm W&w @OΦ']) {
            const real = [...text].reduce((sum, char) => sum + (char === ' ' ? 0.278 : BOLD_ARIAL_EM[char as keyof typeof BOLD_ARIAL_EM]), 0);
            expect(estimateTextWidth(text, 1)).toBeGreaterThanOrEqual(real);
        }
    });
});

describe('layoutTitle', () => {
    it('centres the title in its band', () => {
        expect(layoutTitle('Anna & Nikos')).toEqual({ lines: ['Anna & Nikos'], fontSize: 9, baselines: [25.34], x: 52.5, anchor: 'middle' });
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
        const top = DEFAULT_QR_CARD_LAYOUT.lines.y;
        const bottom = top + DEFAULT_QR_CARD_LAYOUT.lines.height;
        expect(placed.map((line) => line.tone)).toEqual(['body', 'code', 'small', 'strong']);
        for (const line of placed) {
            expect(line.baselines[0] - 0.86 * line.fontSize).toBeGreaterThanOrEqual(top - 0.01);
            expect(line.baselines[line.baselines.length - 1] + 0.34 * line.fontSize).toBeLessThanOrEqual(bottom + 0.01);
        }
    });

    it('leaves out empty lines', () => {
        expect(
            layoutLines([
                { text: '  ', tone: 'body' },
                { text: 'Eleni', tone: 'strong' },
            ]).map((line) => line.tone),
        ).toEqual(['strong']);
    });
});

describe('layout boxes', () => {
    const title = DEFAULT_QR_CARD_LAYOUT.title;

    it('anchors the title to the left or right edge of its box', () => {
        expect(layoutTitle('Anna', { ...title, x: 10, width: 50, align: 'left' })).toMatchObject({ x: 10, anchor: 'start' });
        expect(layoutTitle('Anna', { ...title, x: 10, width: 50, align: 'right' })).toMatchObject({ x: 60, anchor: 'end' });
    });

    it('centres the title in a moved box', () => {
        const placed = layoutTitle('Anna', { ...title, y: 50, height: 20 });
        // One 9 mm line: 10.8 tall, centred in 50..70.
        expect(placed.baselines[0]).toBeCloseTo(50 + (20 - 10.8) / 2 + 0.86 * 9, 2);
    });

    it('shrinks a title to fit a short box', () => {
        const placed = layoutTitle('Anna & Nikos', { ...title, height: 6, maxSize: 16 });
        expect(placed.lines).toHaveLength(1);
        expect(placed.fontSize * 1.2).toBeLessThanOrEqual(6.001);
    });

    it('lets a large maximum grow the title', () => {
        expect(layoutTitle('Anna', { ...title, maxSize: 14 }).fontSize).toBe(14);
    });

    it('scales the lines with the text size, inside a moved box', () => {
        const box = { ...DEFAULT_QR_CARD_LAYOUT.lines, y: 40, height: 30, textSize: 7, align: 'right' as const };
        const [line] = layoutLines([{ text: 'Scan', tone: 'body' }], box);
        expect(line).toMatchObject({ fontSize: 7, x: 97, anchor: 'end' });
        expect(line.baselines[0] - 0.86 * 7).toBeGreaterThanOrEqual(40);
    });
});

describe('QR_CARD_SIZES', () => {
    it('prints A6 and A5 at 300 dpi', () => {
        expect(QR_CARD_SIZES.A6).toEqual({ widthMm: 105, heightMm: 148, widthPx: 1240, heightPx: 1748, widthPt: 297.64, heightPt: 419.53 });
        expect(QR_CARD_SIZES.A5).toEqual({ widthMm: 148, heightMm: 210, widthPx: 1748, heightPx: 2480, widthPt: 419.53, heightPt: 595.28 });
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

    it('cuts at 60 characters without splitting an emoji', () => {
        const name = qrCardFileName(`${'a'.repeat(59)}😀`, 'png');
        expect(name).toBe(`${'a'.repeat(59)}😀.png`);
        expect(qrCardFileName(`${'a'.repeat(60)}😀`, 'png')).toBe(`${'a'.repeat(60)}.png`);
        expect(name).not.toMatch(/\p{Surrogate}/u);
    });

    it('drops a dash left at the cut', () => {
        expect(qrCardFileName(`${'a'.repeat(59)} b`, 'png')).toBe(`${'a'.repeat(59)}.png`);
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
            centerLogo: false,
            layout: null,
            sizes: ['A6', 'A5'],
        };
        expect(qrCardStyleOf(template)).toEqual({
            id: 't1',
            artworkUrl: '/api/qr-card-artwork/t1/1',
            textColor: '#5A3E2B',
            headingFont: null,
            codeColor: '#1F3A5A',
            centerLogo: false,
            layout: DEFAULT_QR_CARD_LAYOUT,
            sizes: ['A6', 'A5'],
        });
    });

    it('keeps Plain as today’s look', () => {
        expect(PLAIN_QR_CARD_STYLE).toMatchObject({ artworkUrl: null, codeColor: '#241F1A', centerLogo: true });
        expect(PLAIN_QR_CARD_STYLE).toMatchObject({ layout: DEFAULT_QR_CARD_LAYOUT, sizes: ['A6', 'A5'] });
    });
});
