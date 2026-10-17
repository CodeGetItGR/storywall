import type { DemoSnapshotDto, MediaResponseDto } from '@/lib/api/types';

export type DemoPreviewPhoto = { src: string; width: number; height: number };
export type DemoPreviewPost = { id: string; author: string; content: string; photo: DemoPreviewPhoto };
export type DemoPreviewWish = { id: string; guestName: string; message: string };
export type DemoPreview = { posts: DemoPreviewPost[]; photos: DemoPreviewPhoto[]; wishes: DemoPreviewWish[] };

const POST_LIMIT = 3;
const PHOTO_LIMIT = 6;
const WISH_LIMIT = 3;

function previewPhoto(media: MediaResponseDto): DemoPreviewPhoto | null {
    const src = media.thumbnailUrl ?? media.mediaUrl;
    if (media.mediaType !== 'IMAGE' || media.status !== 'READY' || !src) return null;
    return { src, width: media.width ?? 1200, height: media.height ?? 900 };
}

// The few real posts, photos and wishes an occasion page shows from its demo event.
export function pickDemoPreview(snapshot: DemoSnapshotDto): DemoPreview {
    const posts: DemoPreviewPost[] = [];
    for (const post of snapshot.posts) {
        if (posts.length === POST_LIMIT) break;
        const photo = post.media.map(previewPhoto).find((candidate) => candidate !== null);
        const content = post.content?.trim();
        if (photo && content) posts.push({ id: post.id, author: post.author?.displayName ?? '', content, photo });
    }

    const photos = snapshot.media
        .map(previewPhoto)
        .filter((photo) => photo !== null)
        .slice(0, PHOTO_LIMIT);

    const wishes = [...snapshot.wishbookEntries]
        .sort((a, b) => Number(b.highlighted === true) - Number(a.highlighted === true))
        .slice(0, WISH_LIMIT)
        .map(({ id, guestName, message }) => ({ id, guestName, message }));

    return { posts, photos, wishes };
}

// An empty snapshot is left out rather than shown as an empty block.
export function hasDemoPreviewContent(preview: DemoPreview): boolean {
    return preview.posts.length > 0 || preview.photos.length > 0 || preview.wishes.length > 0;
}
