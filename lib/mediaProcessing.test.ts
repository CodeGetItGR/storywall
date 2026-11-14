import { describe, expect, it } from 'vitest';

import type { MediaResponseDto } from '@/lib/api/types';
import { PROCESSING_POLL_WINDOW_MS, PROCESSING_REFRESH_MS, processingAwareRefreshMs } from '@/lib/mediaProcessing';

const NOW = Date.parse('2026-11-14T17:10:00Z');
const BASE = 20 * 60_000;

function media(overrides: Partial<MediaResponseDto>): MediaResponseDto {
    return { id: 'm', mediaType: 'IMAGE', status: 'READY', createdAt: '2026-11-14T17:09:00Z', ...overrides } as MediaResponseDto;
}

describe('processingAwareRefreshMs', () => {
    it('keeps the signing-window refresh when nothing is processing', () => {
        expect(processingAwareRefreshMs([media({}), media({ mediaType: 'VIDEO' })], BASE, NOW)).toBe(BASE);
    });

    it('checks often while a recent video is processing', () => {
        const items = [media({}), media({ mediaType: 'VIDEO', status: 'PROCESSING' })];
        expect(processingAwareRefreshMs(items, BASE, NOW)).toBe(PROCESSING_REFRESH_MS);
    });

    it('stops checking often once the video has been processing longer than any run takes', () => {
        const stuck = media({
            mediaType: 'VIDEO',
            status: 'PROCESSING',
            createdAt: new Date(NOW - PROCESSING_POLL_WINDOW_MS - 1).toISOString(),
        });
        expect(processingAwareRefreshMs([stuck], BASE, NOW)).toBe(BASE);
    });

    it('never polls faster than the signing window asks for', () => {
        const items = [media({ mediaType: 'VIDEO', status: 'PROCESSING' })];
        expect(processingAwareRefreshMs(items, 1000, NOW)).toBe(1000);
    });

    it('keeps an empty list on the signing-window refresh', () => {
        expect(processingAwareRefreshMs([], BASE, NOW)).toBe(BASE);
    });
});
