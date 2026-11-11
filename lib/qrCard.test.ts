import { afterEach, describe, expect, it, vi } from 'vitest';

import type { QrCardTemplateDto } from '@/lib/api/types';
import {
    estimateTextWidth,
    fitText,
    giftQrCardLines,
    isAndroidBrowser,
    layoutLines,
    layoutTitle,
    PLAIN_QR_CARD_STYLE,
    QR_CARD_LINE_BOXES,
    QR_CARD_SIZES,
    QR_CARD_TITLE_BOX,
    qrCardFileName,
    qrCardLineKey,
    qrCardOrientedSheet,
    qrCardSheet,
    qrCardStyleOf,
} from '@/lib/qrCard';
import { DEFAULT_QR_CARD_LAYOUT, DEFAULT_QR_CARD_TITLE } from '@/lib/qrCardLayout';

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
    const title = DEFAULT_QR_CARD_TITLE;

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

describe('qrCardLineKey', () => {
    it('keeps the line of every other code', () => {
        expect(qrCardLineKey('EVENT_JOIN', ['UPLOAD', 'WISH'])).toBe('join');
        expect(qrCardLineKey('INVITATION', ['UPLOAD', 'WISH'])).toBe('invitation');
        expect(qrCardLineKey('MEDIA_UPLOAD', ['UPLOAD', 'WISH'])).toBe('gallery');
    });

    it('words the guest code by what it offers', () => {
        expect(qrCardLineKey('GUEST', ['UPLOAD'])).toBe('gallery');
        expect(qrCardLineKey('GUEST', ['WISH'])).toBe('guestWish');
        expect(qrCardLineKey('GUEST', ['UPLOAD', 'WISH'])).toBe('guestBoth');
    });
});

describe('default lines', () => {
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

describe('qrCardSheet', () => {
    it('fits four A6 cards 2 × 2 on A4 portrait, centred, at true size', () => {
        const sheet = qrCardSheet('A6');

        expect([sheet.widthMm, sheet.heightMm]).toEqual([210, 297]);
        expect([sheet.cardWidthMm, sheet.cardHeightMm]).toEqual([105, 148]);
        expect([sheet.columns, sheet.rows]).toEqual([2, 2]);
        expect(sheet.cards).toEqual([
            { x: 0, y: 0.5 },
            { x: 105, y: 0.5 },
            { x: 0, y: 148.5 },
            { x: 105, y: 148.5 },
        ]);
    });

    it('cuts once down the middle and once across between the A6 cards', () => {
        expect(qrCardSheet('A6').cuts).toEqual([
            { x1: 105, y1: 0.5, x2: 105, y2: 296.5 },
            { x1: 0, y1: 148.5, x2: 210, y2: 148.5 },
        ]);
    });

    it('turns A4 to landscape for two A5 cards side by side', () => {
        const sheet = qrCardSheet('A5');

        expect([sheet.widthMm, sheet.heightMm]).toEqual([297, 210]);
        expect([sheet.cardWidthMm, sheet.cardHeightMm]).toEqual([148, 210]);
        expect([sheet.columns, sheet.rows]).toEqual([2, 1]);
        expect(sheet.cards).toEqual([
            { x: 0.5, y: 0 },
            { x: 148.5, y: 0 },
        ]);
        expect(sheet.cuts).toEqual([{ x1: 148.5, y1: 0, x2: 148.5, y2: 210 }]);
    });

    it('keeps every card inside the sheet', () => {
        for (const size of ['A6', 'A5'] as const) {
            const sheet = qrCardSheet(size);
            for (const card of sheet.cards) {
                expect(card.x).toBeGreaterThanOrEqual(0);
                expect(card.y).toBeGreaterThanOrEqual(0);
                expect(card.x + sheet.cardWidthMm).toBeLessThanOrEqual(sheet.widthMm);
                expect(card.y + sheet.cardHeightMm).toBeLessThanOrEqual(sheet.heightMm);
            }
        }
    });
});

describe('qrCardOrientedSheet', () => {
    it('keeps A6 cards upright on portrait A4', () => {
        const sheet = qrCardOrientedSheet('A6', 'portrait');

        expect([sheet.widthMm, sheet.heightMm]).toEqual([210, 297]);
        expect(sheet.turned).toBe(false);
        expect([sheet.cellWidthMm, sheet.cellHeightMm]).toEqual([105, 148]);
        expect([sheet.columns, sheet.rows]).toEqual([2, 2]);
    });

    it('turns A6 cards sideways on landscape A4', () => {
        const sheet = qrCardOrientedSheet('A6', 'landscape');

        expect([sheet.widthMm, sheet.heightMm]).toEqual([297, 210]);
        expect(sheet.turned).toBe(true);
        expect([sheet.cellWidthMm, sheet.cellHeightMm]).toEqual([148, 105]);
        expect([sheet.columns, sheet.rows]).toEqual([2, 2]);
    });

    it('turns A5 cards sideways on portrait A4', () => {
        const sheet = qrCardOrientedSheet('A5', 'portrait');

        expect([sheet.widthMm, sheet.heightMm]).toEqual([210, 297]);
        expect(sheet.turned).toBe(true);
        expect([sheet.cellWidthMm, sheet.cellHeightMm]).toEqual([210, 148]);
        expect([sheet.columns, sheet.rows]).toEqual([1, 2]);
        expect(sheet.cuts).toEqual([{ x1: 0, y1: 148.5, x2: 210, y2: 148.5 }]);
    });

    it('keeps A5 cards upright on landscape A4', () => {
        const sheet = qrCardOrientedSheet('A5', 'landscape');

        expect(sheet.turned).toBe(false);
        expect([sheet.columns, sheet.rows]).toEqual([2, 1]);
    });

    it.each(['A6', 'A5'] as const)('holds as many %s cards either way as the saved sheet', (size) => {
        const count = qrCardSheet(size).cards.length;

        expect(qrCardOrientedSheet(size, 'portrait').cards).toHaveLength(count);
        expect(qrCardOrientedSheet(size, 'landscape').cards).toHaveLength(count);
    });

    it.each(['A6', 'A5'] as const)('keeps every %s cell inside the sheet', (size) => {
        for (const orientation of ['portrait', 'landscape'] as const) {
            const sheet = qrCardOrientedSheet(size, orientation);
            for (const card of sheet.cards) {
                expect(card.x).toBeGreaterThanOrEqual(0);
                expect(card.y).toBeGreaterThanOrEqual(0);
                expect(card.x + sheet.cellWidthMm).toBeLessThanOrEqual(sheet.widthMm);
                expect(card.y + sheet.cellHeightMm).toBeLessThanOrEqual(sheet.heightMm);
            }
        }
    });

    it('leaves the saved sheet upright', () => {
        expect(qrCardSheet('A5').turned).toBe(false);
        expect(qrCardSheet('A6').turned).toBe(false);
    });
});

describe('isAndroidBrowser', () => {
    afterEach(() => vi.unstubAllGlobals());

    it.each([
        ['Chrome on Android', 'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 Chrome/154.0 Mobile Safari/537.36', true],
        ['Samsung Internet', 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 SamsungBrowser/27.0 Chrome/125.0 Mobile Safari/537.36', true],
        ['an iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', false],
        ['Chrome on Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0 Safari/537.36', false],
    ])('reads %s', (_name, userAgent, expected) => {
        vi.stubGlobal('navigator', { userAgent });

        expect(isAndroidBrowser()).toBe(expected);
    });
});
