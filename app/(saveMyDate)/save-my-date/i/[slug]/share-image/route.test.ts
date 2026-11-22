// @vitest-environment node
import sharp from 'sharp';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InvitationElement } from '@/lib/invitation/elements';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import { SHARE_IMAGE_MAX_BYTES } from '@/lib/og/sharePhoto';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

// The real route, loader, picture choice, sharp and next/og; only the network and the request are stubbed.
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7' }) }));
vi.mock('next-intl/server', () => ({
    getLocale: async () => 'en',
    getTranslations: async ({ locale, namespace }: { locale: 'el' | 'en'; namespace: keyof typeof en }) => {
        const messages = locale === 'el' ? el : en;
        return (key: string, values: Record<string, unknown> = {}) =>
            (messages[namespace] as Record<string, string>)[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));
    },
}));

import { GET } from './route';

const fetchMock = vi.fn();
let couplePhoto: Buffer;
let topBackground: Buffer;

const coupleTop: InvitationElement[] = [
    {
        id: 'e-photo',
        kind: 'photoFrame',
        frameId: '',
        photo: { source: 'media', mediaId: 'm-couple' },
        imageX: 50,
        imageY: 50,
        zoom: 1,
        boxScale: 1,
        imageWidth: 0,
        imageHeight: 0,
        animation: 'none',
    },
    { id: 'e-names', kind: 'text', role: 'title', text: 'Άγγελος & Αλεξάνδρα', style: {} },
];

function invitationWithTop(elements: InvitationElement[]) {
    const document = {
        ...SAMPLE_DOCUMENT,
        sections: SAMPLE_DOCUMENT.sections.map((section) => (section.type === 'top' ? { ...section, elements } : section)),
    };
    return {
        slug: 'angelos-alexandra',
        design: SAMPLE_THEME,
        document,
        imageUrls: { 'm-couple': 'https://r2.example/couple.webp?sig=1', 'm-top': 'https://r2.example/top.webp?sig=1' },
        updatedAt: '2026-11-10T09:00:00Z',
    };
}

type Backend = { status?: number; body?: unknown; couple?: 'ok' | 'gone' | 'html'; top?: 'ok' | 'gone' };

function backend({ status = 200, body = invitationWithTop(coupleTop), couple = 'ok', top = 'ok' }: Backend = {}) {
    fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('/api/public/invitations/')) return new Response(status === 200 ? JSON.stringify(body) : null, { status });
        if (url.startsWith('https://r2.example/couple')) {
            if (couple === 'html') return new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } });
            return couple === 'ok' ? new Response(new Uint8Array(couplePhoto), { headers: { 'Content-Type': 'image/webp' } }) : new Response(null, { status: 403 });
        }
        if (url.startsWith('https://r2.example/top')) {
            return top === 'ok' ? new Response(new Uint8Array(topBackground), { headers: { 'Content-Type': 'image/webp' } }) : new Response(null, { status: 403 });
        }
        // Google Fonts: offline here, so the card falls back to the built-in font.
        return new Response(null, { status: 503 });
    });
}

const visit = (slug = 'angelos-alexandra') => ({ params: Promise.resolve({ slug }) });

async function picture(response: Response) {
    const bytes = Buffer.from(await response.arrayBuffer());
    const { width, height, format } = await sharp(bytes).metadata();
    const { dominant } = await sharp(bytes).stats();
    return { bytes, width, height, format, dominant };
}

beforeAll(async () => {
    // A red portrait photo and a blue background, both webp like the real uploads.
    couplePhoto = await sharp({ create: { width: 900, height: 1200, channels: 3, background: '#d02020' } }).webp().toBuffer();
    topBackground = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#2040d0' } }).webp().toBuffer();
});

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('The share picture of a published invitation', () => {
    it("is the top section's photo, as a 1200×630 JPEG under WhatsApp's limit", async () => {
        backend();
        const response = await GET(new Request('http://localhost/x'), visit());
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('image/jpeg');
        expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
        expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
        const image = await picture(response);
        expect(image).toMatchObject({ width: 1200, height: 630, format: 'jpeg' });
        expect(image.bytes.length).toBeLessThan(SHARE_IMAGE_MAX_BYTES);
        expect(image.dominant.r).toBeGreaterThan(150);
        expect(image.dominant.b).toBeLessThan(100);
    });

    it('asks the backend afresh every time, for links that have not expired', async () => {
        backend();
        await GET(new Request('http://localhost/x'), visit());
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toMatch(/\/api\/public\/invitations\/angelos-alexandra$/);
        expect(init.cache).toBe('no-store');
    });

    it("falls back to the top background when the photo can't be loaded", async () => {
        backend({ couple: 'gone' });
        const image = await picture(await GET(new Request('http://localhost/x'), visit()));
        expect(image).toMatchObject({ width: 1200, height: 630, format: 'jpeg' });
        expect(image.dominant.b).toBeGreaterThan(150);
        expect(image.dominant.r).toBeLessThan(100);
    });

    it('ignores a link that answers with something other than a picture', async () => {
        backend({ couple: 'html' });
        const image = await picture(await GET(new Request('http://localhost/x'), visit()));
        expect(image.dominant.b).toBeGreaterThan(150);
    });

    it('draws the card in the theme colours when there is no picture at all', async () => {
        backend({ couple: 'gone', top: 'gone' });
        const response = await GET(new Request('http://localhost/x'), visit());
        expect(response.status).toBe(200);
        const image = await picture(response);
        expect(image).toMatchObject({ width: 1200, height: 630, format: 'jpeg' });
        expect(image.bytes.length).toBeLessThan(SHARE_IMAGE_MAX_BYTES);
        // The theme's secondary colour, #efe7ec, fills the card.
        expect(Math.abs(image.dominant.r - 0xef)).toBeLessThan(24);
        expect(Math.abs(image.dominant.g - 0xe7)).toBeLessThan(24);
    });

    it('is not there for an unknown or expired link', async () => {
        backend({ status: 404 });
        expect((await GET(new Request('http://localhost/x'), visit())).status).toBe(404);
        backend({ status: 410 });
        expect((await GET(new Request('http://localhost/x'), visit())).status).toBe(404);
        fetchMock.mockClear();
        expect((await GET(new Request('http://localhost/x'), visit('NOT A SLUG'))).status).toBe(404);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('is not cached when the backend fails', async () => {
        backend({ status: 503 });
        const response = await GET(new Request('http://localhost/x'), visit());
        expect(response.status).toBe(503);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('is not there on the production site before launch', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
        backend();
        expect((await GET(new Request('http://localhost/x'), visit())).status).toBe(404);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
