import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfigResponseDto } from '@/lib/api/types';
import { QR_WEDDING_CREATE_HREF, qrWeddingPageLive } from '@/lib/qrWeddingPage';

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

describe('QR_WEDDING_CREATE_HREF', () => {
    it('opens the create wizard on weddings', () => {
        expect(QR_WEDDING_CREATE_HREF).toBe('/events/new?type=wedding');
    });
});
