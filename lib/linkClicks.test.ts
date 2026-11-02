import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { linkClickAttributes, qrLinkAttributes, readLinkClick, sendLinkClick } from '@/lib/linkClicks';

const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 204 })));

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockClear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function linkWith(attributes: Record<string, string>) {
    const link = document.createElement('a');
    for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value);
    return link;
}

describe('readLinkClick', () => {
    it('reads back what the attributes wrote', () => {
        expect(readLinkClick(linkWith(qrLinkAttributes('faq')))).toEqual({ target: 'QR_WEDDING', placement: 'faq' });
        expect(readLinkClick(linkWith(linkClickAttributes({ target: 'QR_WEDDING', placement: 'hero' })))).toEqual({
            target: 'QR_WEDDING',
            placement: 'hero',
        });
    });

    it('ignores unknown links and places', () => {
        expect(readLinkClick(linkWith({ 'data-link-click': 'ELSEWHERE:faq' }))).toBeNull();
        expect(readLinkClick(linkWith({ 'data-link-click': 'QR_WEDDING:sidebar' }))).toBeNull();
        expect(readLinkClick(linkWith({}))).toBeNull();
    });
});

describe('sendLinkClick', () => {
    it("sends the page and its language to Spring's counter without cookies", () => {
        sendLinkClick({ target: 'QR_WEDDING', placement: 'faq' }, '/el/gamos');
        const [url, init] = fetchMock.mock.calls[0]!;
        expect(String(url)).toMatch(/\/api\/public\/link-clicks$/);
        expect(init).toMatchObject({ method: 'POST', keepalive: true, credentials: 'omit' });
        expect(JSON.parse(String(init!.body))).toEqual({ target: 'QR_WEDDING', placement: 'faq', page: '/el/gamos', language: 'el' });
    });
});
