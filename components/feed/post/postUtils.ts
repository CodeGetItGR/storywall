'use client';

import type { PostResponseDto } from '@/lib/api/types';

export function isPlaylistDigestPost(post: PostResponseDto) {
    return post.type === 'PLAYLIST' && post.author === null;
}

export function isAnnouncementPost(post: PostResponseDto) {
    return post.type === 'ANNOUNCEMENT';
}

// A photographer's or videographer's pinned first look (spec 2026-10-29).
export function isSneakPeekPost(post: PostResponseDto) {
    return post.type === 'SNEAK_PEEK';
}
