'use client';

import type { PostResponseDto } from '@/lib/api/types';

export function isPlaylistDigestPost(post: PostResponseDto) {
    return post.type === 'PLAYLIST' && post.author === null;
}
