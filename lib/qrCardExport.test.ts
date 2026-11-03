import { decodePDFRawStream, PDFArray, PDFDocument, type PDFPage, PDFRawStream } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventThemeFontDto } from '@/lib/api/types';
import { qrCardSheet } from '@/lib/qrCard';
import { qrCardPdfBytes, selfContainedQrSvg, standaloneQrCardSvg, toDataUri } from '@/lib/qrCardExport';

// A 1 × 1 transparent PNG.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SVG_NS = 'http://www.w3.org/2000/svg';
const FONT: EventThemeFontDto = { key: 'alegreya', fallback: 'serif', url: '/api/theme-fonts/alegreya/1.woff2' };

function bytes(base64: string): ArrayBuffer {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)).buffer;
}

// The page's drawing operators as text.
function pageContent(page: PDFPage): string {
    const contents = page.node.Contents();
    const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
    return refs
        .map((ref) => page.doc.context.lookup(ref))
        .filter((stream): stream is PDFRawStream => stream instanceof PDFRawStream)
        .map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode()))
        .join('\n');
}

function respond(type: string, body: Uint8Array) {
    return new Response(body, { status: 200, headers: { 'Content-Type': type } });
}

function cardSvg(): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    svg.setAttribute('viewBox', '0 0 105 148');
    svg.setAttribute('class', 'block w-full');
    for (const href of ['/api/qr-card-artwork/t1/1', 'data:image/png;base64,AA==']) {
        const image = document.createElementNS(SVG_NS, 'image');
        image.setAttribute('href', href);
        svg.appendChild(image);
    }
    return svg;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('toDataUri', () => {
    it('inlines a file with its own type', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond('image/png; charset=binary', new Uint8Array([1, 2, 3]))));
        await expect(toDataUri('/a.png')).resolves.toBe('data:image/png;base64,AQID');
    });

    it('fails on a missing file', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
        await expect(toDataUri('/gone.png')).rejects.toThrow();
    });
});

describe('standaloneQrCardSvg', () => {
    it('sizes the card for export and inlines its images', async () => {
        const fetchMock = vi.fn().mockResolvedValue(respond('image/webp', new Uint8Array([9])));
        vi.stubGlobal('fetch', fetchMock);

        const markup = await standaloneQrCardSvg(cardSvg(), null, 'A6');

        expect(markup).toContain('width="1240"');
        expect(markup).toContain('height="1748"');
        expect(markup).not.toContain('class=');
        expect(markup).toContain('href="data:image/webp;base64,CQ=="');
        expect(markup).toContain('href="data:image/png;base64,AA=="');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('embeds the title font', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockImplementation(async (url: string) =>
                    url.endsWith('.woff2') ? respond('font/woff2', new Uint8Array([7])) : respond('image/webp', new Uint8Array([9])),
                ),
        );

        const markup = await standaloneQrCardSvg(cardSvg(), FONT, 'A6');

        expect(markup).toContain('@font-face');
        expect(markup).toContain('font-family:"theme-alegreya"');
        expect(markup).toContain('url("data:font/woff2;base64,Bw==")');
        expect(markup).not.toContain('/api/theme-fonts/');
    });

    it('sizes the card for A5', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond('image/webp', new Uint8Array([9]))));
        const markup = await standaloneQrCardSvg(cardSvg(), null, 'A5');
        expect(markup).toContain('width="1748"');
        expect(markup).toContain('height="2480"');
    });

    it("leaves the page's own card untouched", async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond('image/webp', new Uint8Array([9]))));
        const svg = cardSvg();

        await standaloneQrCardSvg(svg, null, 'A6');

        expect(svg.getAttribute('class')).toBe('block w-full');
        expect(svg.querySelector('image')?.getAttribute('href')).toBe('/api/qr-card-artwork/t1/1');
    });
});

describe('selfContainedQrSvg', () => {
    it('inlines the logo and keeps the page code as it is', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond('image/svg+xml', new Uint8Array([60]))));
        const svg = cardSvg();

        const markup = await selfContainedQrSvg(svg);

        expect(markup).toContain('href="data:image/svg+xml;base64,PA=="');
        expect(markup).not.toContain('/api/qr-card-artwork/');
        expect(svg.querySelector('image')?.getAttribute('href')).toBe('/api/qr-card-artwork/t1/1');
    });
});

describe('qrCardPdfBytes', () => {
    it('puts the PNG on one A6 page', async () => {
        const pdf = await PDFDocument.load(await qrCardPdfBytes(bytes(PNG_BASE64), 'A6'));

        expect(pdf.getPageCount()).toBe(1);
        const { width, height } = pdf.getPage(0).getSize();
        expect(width).toBeCloseTo(297.64, 1);
        expect(height).toBeCloseTo(419.53, 1);
    });

    it('puts the PNG on one A5 page', async () => {
        const pdf = await PDFDocument.load(await qrCardPdfBytes(bytes(PNG_BASE64), 'A5'));
        const { width, height } = pdf.getPage(0).getSize();
        expect(width).toBeCloseTo(419.53, 1);
        expect(height).toBeCloseTo(595.28, 1);
    });

    it('puts four A6 cards on one A4 sheet with cut lines', async () => {
        const pdf = await PDFDocument.load(await qrCardPdfBytes(bytes(PNG_BASE64), 'A6', qrCardSheet('A6')));

        expect(pdf.getPageCount()).toBe(1);
        const page = pdf.getPage(0);
        const { width, height } = page.getSize();
        expect(width).toBeCloseTo(595.28, 1);
        expect(height).toBeCloseTo(841.89, 1);
        const content = pageContent(page);
        // One image draw per card, each scaled to 105 × 148 mm in points, the bottom row 0.5 mm up.
        expect(content.match(/ Do$/gm)).toHaveLength(4);
        expect(content.match(/^297\.6\d* 0 0 419\.5\d* 0 0 cm$/gm)).toHaveLength(4);
        expect(content).toContain('1 0 0 1 297.6377952755906 1.417322834645688 cm');
        // Two cut lines.
        expect(content.match(/ l$/gm)).toHaveLength(2);
    });

    it('puts two A5 cards on one A4 landscape sheet', async () => {
        const pdf = await PDFDocument.load(await qrCardPdfBytes(bytes(PNG_BASE64), 'A5', qrCardSheet('A5')));
        const { width, height } = pdf.getPage(0).getSize();
        expect(width).toBeCloseTo(841.89, 1);
        expect(height).toBeCloseTo(595.28, 1);
    });
});
