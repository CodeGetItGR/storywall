import { describe, expect, it } from 'vitest';

import type { DemoSnapshotDto, MediaResponseDto, PostResponseDto, WishbookEntryResponseDto } from '@/lib/api/types';
import { pickDemoPreview } from '@/lib/occasions/demoPreview';

function media(id: string, overrides: Partial<MediaResponseDto> = {}): MediaResponseDto {
    return {
        id,
        mediaType: 'IMAGE',
        status: 'READY',
        mediaUrl: `https://media/${id}.jpg`,
        thumbnailUrl: `https://media/${id}-t.jpg`,
        width: 1200,
        height: 800,
        ...overrides,
    } as MediaResponseDto;
}

function post(id: string, content: string | null, items: MediaResponseDto[]): PostResponseDto {
    return { id, content, media: items, author: { displayName: `Guest ${id}` } } as PostResponseDto;
}

function wish(id: string, highlighted: boolean | null): WishbookEntryResponseDto {
    return { id, guestName: `Guest ${id}`, message: `Wish ${id}`, highlighted } as WishbookEntryResponseDto;
}

describe('pickDemoPreview', () => {
    it('keeps posts with text and a ready photo, photos and wishes, starred wishes first', () => {
        const snapshot = {
            presignedUrlsValidUntil: '2026-10-12T10:15:00Z',
            posts: [
                post('p1', 'Hello', [media('m1')]),
                post('p2', null, [media('m2')]),
                post('p3', 'Video only', [media('m3', { mediaType: 'VIDEO' })]),
                post('p4', 'Two', [media('m4'), media('m5')]),
            ],
            media: [media('m1'), media('m2'), media('m3', { mediaType: 'VIDEO' }), media('m6', { status: 'PROCESSING' })],
            wishbookEntries: [wish('w1', false), wish('w2', true), wish('w3', null)],
        } as unknown as DemoSnapshotDto;

        const preview = pickDemoPreview(snapshot);

        expect(preview.posts.map((p) => p.id)).toEqual(['p1', 'p4']);
        expect(preview.posts[0]).toEqual({
            id: 'p1',
            author: 'Guest p1',
            content: 'Hello',
            photo: { src: 'https://media/m1-t.jpg', width: 1200, height: 800 },
        });
        expect(preview.photos.map((photo) => photo.src)).toEqual(['https://media/m1-t.jpg', 'https://media/m2-t.jpg']);
        expect(preview.wishes.map((w) => w.id)).toEqual(['w2', 'w1', 'w3']);
    });

    it('caps each list', () => {
        const many = Array.from({ length: 12 }, (_, i) => media(`m${i}`));
        const snapshot = {
            presignedUrlsValidUntil: null,
            posts: many.map((m, i) => post(`p${i}`, 'x', [m])),
            media: many,
            wishbookEntries: Array.from({ length: 9 }, (_, i) => wish(`w${i}`, false)),
        } as unknown as DemoSnapshotDto;

        const preview = pickDemoPreview(snapshot);
        expect(preview.posts).toHaveLength(3);
        expect(preview.photos).toHaveLength(6);
        expect(preview.wishes).toHaveLength(3);
    });
});
