import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfigResponseDto } from '@/lib/api/types';
import { QR_WEDDING_CREATE_HREF, qrWeddingFaqItems, qrWeddingMovedPath, qrWeddingPageLive, qrWeddingRedirectPath } from '@/lib/qrWeddingPage';

function config(eventTypes: { eventTypeKey: string; isEnabled: boolean }[]): AppConfigResponseDto {
    return { eventTypes } as unknown as AppConfigResponseDto;
}

describe('qrWeddingPageLive', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('is live while weddings are on', () => {
        expect(qrWeddingPageLive(config([{ eventTypeKey: 'WEDDING', isEnabled: true }]))).toBe(true);
    });

    it('is hidden while weddings are off or missing', () => {
        expect(qrWeddingPageLive(config([{ eventTypeKey: 'WEDDING', isEnabled: false }]))).toBe(false);
        expect(qrWeddingPageLive(config([{ eventTypeKey: 'BAPTISM', isEnabled: true }]))).toBe(false);
    });

    it('stays live when the config is unknown', () => {
        expect(qrWeddingPageLive(null)).toBe(true);
    });

    it('is hidden on the production site before launch', () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        expect(qrWeddingPageLive(config([{ eventTypeKey: 'WEDDING', isEnabled: true }]))).toBe(false);
        expect(qrWeddingPageLive(null)).toBe(false);
    });
});

describe('qrWeddingRedirectPath', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('sends each language to its wedding page on the production site before launch', () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        expect(qrWeddingRedirectPath('/qr-code-for-wedding-photos')).toBe('/weddings');
        expect(qrWeddingRedirectPath('/wedding-qr-code')).toBe('/weddings');
        expect(qrWeddingRedirectPath('/el/qr-code-gamou')).toBe('/el/gamos');
    });

    it('leaves every other path alone', () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        expect(qrWeddingRedirectPath('/el/wedding-qr-code')).toBeNull();
        expect(qrWeddingRedirectPath('/weddings')).toBeNull();
    });

    it('does nothing where the page is live', () => {
        expect(qrWeddingRedirectPath('/wedding-qr-code')).toBeNull();
        vi.stubEnv('VERCEL_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'staging');
        expect(qrWeddingRedirectPath('/el/qr-code-gamou')).toBeNull();
    });
});

describe('qrWeddingMovedPath', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('sends the earlier English URLs to the current one', () => {
        expect(qrWeddingMovedPath('/wedding-qr-code')).toBe('/qr-code-for-wedding-photos');
        expect(qrWeddingMovedPath('/en/wedding-qr-code')).toBe('/qr-code-for-wedding-photos');
        expect(qrWeddingMovedPath('/qr-code-for-wedding-photos')).toBeNull();
    });

    it('leaves them to the pre-launch redirect on the production site', () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        expect(qrWeddingMovedPath('/wedding-qr-code')).toBeNull();
    });
});

describe('qrWeddingFaqItems', () => {
    const items = [
        { q: 'Free?', a: 'No.' },
        { q: 'Cost?', a: 'From {price}.' },
    ];

    it('fills in the price', () => {
        expect(qrWeddingFaqItems(items, '119€')).toEqual([items[0], { q: 'Cost?', a: 'From 119€.' }]);
    });

    it('leaves out an answer that needs a price it does not have', () => {
        expect(qrWeddingFaqItems(items, '')).toEqual([items[0]]);
    });
});

describe('QR_WEDDING_CREATE_HREF', () => {
    it('opens the create wizard on weddings', () => {
        expect(QR_WEDDING_CREATE_HREF).toBe('/events/new?type=wedding');
    });
});
