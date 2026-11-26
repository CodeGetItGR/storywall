'use client';

import { PlaylistDigestCard } from '@/components/feed/PlaylistDigestCard';
import { isPlaylistDigestPost } from '@/components/feed/post/postUtils';
import { PostCard } from '@/components/feed/PostCard';
import type { PostResponseDto } from '@/lib/api/types';

interface FeedPostRendererProps {
    post: PostResponseDto;
    isLcpCandidate?: boolean;
    isFirst?: boolean;
    endsPage?: boolean;
}

export function FeedPostRenderer({ post, isLcpCandidate = false, isFirst = false, endsPage = false }: FeedPostRendererProps) {
    if (isPlaylistDigestPost(post)) {
        return <PlaylistDigestCard post={post} />;
    }

    return <PostCard post={post} isLcpCandidate={isLcpCandidate} isFirst={isFirst} endsPage={endsPage} />;
}
