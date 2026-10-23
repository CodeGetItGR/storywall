import { describe, expect, it } from 'vitest';

import type { DemoSnapshotDto, MediaResponseDto, PostResponseDto, WishbookEntryResponseDto } from '@/lib/api/types';
import { demoCollage, type DemoPreview, pickDemoPreview } from '@/lib/occasions/demoPreview';

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

describe('demoCollage', () => {
    const photo = (id: string) => ({ src: `https://media/${id}.jpg`, width: 1200, height: 800 });
    const preview = (overrides: Partial<DemoPreview>): DemoPreview => ({ posts: [], photos: [], wishes: [], ...overrides });

    it('leads with the first post, then the other photos once each, two beside a wish', () => {
        const collage = demoCollage(
            preview({
                posts: [
                    { id: 'p1', author: 'A', content: 'Hi', photo: photo('m1') },
                    { id: 'p2', author: 'B', content: 'Yo', photo: photo('m2') },
                ],
                photos: [photo('m1'), photo('m2'), photo('m3'), photo('m4')],
                wishes: [{ id: 'w1', guestName: 'C', message: 'Congrats' }],
            }),
        );

        expect(collage?.lead.post?.id).toBe('p1');
        expect(collage?.tiles.map((tile) => tile.src)).toEqual(['https://media/m2.jpg', 'https://media/m3.jpg']);
        expect(collage?.wish?.id).toBe('w1');
    });

    it('leads with a photo when there is no post and fills four tiles without a wish', () => {
        const collage = demoCollage(preview({ photos: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map(photo) }));

        expect(collage?.lead).toEqual({ photo: photo('m1'), post: null });
        expect(collage?.tiles).toHaveLength(4);
        expect(collage?.wish).toBeNull();
    });

    it('is null without a photo to lead with', () => {
        expect(demoCollage(preview({ wishes: [{ id: 'w1', guestName: 'C', message: 'Congrats' }] }))).toBeNull();
    });
});
