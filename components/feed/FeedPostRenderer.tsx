'use client';

import { PlaylistDigestCard } from '@/components/feed/PlaylistDigestCard';
import { isPlaylistDigestPost } from '@/components/feed/post';
import { PostCard } from '@/components/feed/PostCard';
import type { PostResponseDto } from '@/lib/api/types';

interface FeedPostRendererProps {
    post: PostResponseDto;
    isLcpCandidate?: boolean;
}

export function FeedPostRenderer({ post, isLcpCandidate = false }: FeedPostRendererProps) {
    if (isPlaylistDigestPost(post)) {
        return <PlaylistDigestCard post={post} />;
    }

    return <PostCard post={post} isLcpCandidate={isLcpCandidate} />;
}
