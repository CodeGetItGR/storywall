'use client';

import { PlaylistDigestCard } from '@/components/feed/PlaylistDigestCard';
import { PostCard } from '@/components/feed/PostCard';
import type { PostResponseDto } from '@/lib/api/types';
import { isPlaylistDigestPost } from '@/lib/feed/playlistDigest';

interface FeedPostRendererProps {
    post: PostResponseDto;
    isLcpCandidate?: boolean;
    startsRun?: boolean;
    endsRun?: boolean;
}

export function FeedPostRenderer({ post, isLcpCandidate = false, startsRun = false, endsRun = false }: FeedPostRendererProps) {
    if (isPlaylistDigestPost(post)) {
        return <PlaylistDigestCard post={post} />;
    }

    return <PostCard post={post} isLcpCandidate={isLcpCandidate} startsRun={startsRun} endsRun={endsRun} />;
}
