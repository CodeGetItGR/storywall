// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/c/[code]/route';

const TARGET = { destinationPath: '/el', destinationAnchor: 'pricing', utmSource: 'instagram', utmMedium: 'paid_social', utmCampaign: 'sale' };

function open(path: string, code: string) {
    return GET(new NextRequest(`https://www.storywall.gr${path}`), { params: Promise.resolve({ code }) });
}

function springAnswers(response: Response | Error) {
    const fetchMock = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

describe('campaign short address', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('redirects to the full URL, temporarily', async () => {
        springAnswers(Response.json(TARGET));
        const response = await open('/c/instagram-paid-sale', 'instagram-paid-sale');
        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe(
            'https://www.storywall.gr/el?utm_source=instagram&utm_medium=paid_social&utm_campaign=sale#pricing',
        );
    });

    it('keeps an ad click id, and the saved values win over the address', async () => {
        springAnswers(Response.json(TARGET));
        const response = await open('/c/instagram-paid-sale?gclid=abc&utm_source=other', 'instagram-paid-sale');
        const location = new URL(response.headers.get('location') ?? '');
        expect(location.searchParams.get('gclid')).toBe('abc');
        expect(location.searchParams.getAll('utm_source')).toEqual(['instagram']);
    });

    it('accepts a code typed in capitals', async () => {
        const fetchMock = springAnswers(Response.json(TARGET));
        await open('/c/Instagram-Paid-Sale', 'Instagram-Paid-Sale');
        expect(String(fetchMock.mock.calls[0])).toContain('/api/public/campaign-links/instagram-paid-sale');
    });

    it('leads home when the code is unknown', async () => {
        springAnswers(new Response(null, { status: 404 }));
        const response = await open('/c/gone', 'gone');
        expect(response.headers.get('location')).toBe('https://www.storywall.gr/');
    });

    it('leads home when Spring is down', async () => {
        springAnswers(new Error('down'));
        const response = await open('/c/any', 'any');
        expect(response.headers.get('location')).toBe('https://www.storywall.gr/');
    });

    it('never asks Spring about a code that could not exist', async () => {
        const fetchMock = springAnswers(Response.json(TARGET));
        const response = await open('/c/..%2Fadmin', '../admin');
        expect(fetchMock).not.toHaveBeenCalled();
        expect(response.headers.get('location')).toBe('https://www.storywall.gr/');
    });
});
