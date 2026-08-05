'use client';

import { useTranslations } from 'next-intl';

import { CommentCount } from '@/components/feed/post/CommentCount';
import { PostMediaCarousel } from '@/components/feed/post/PostMediaCarousel';
import { ReactionCount } from '@/components/feed/post/ReactionCount';
import type { PostResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { isPlaylistDigestPost } from './postUtils';

interface PostMediaColumnProps {
    postKey: string;
    post: PostResponseDto;
    clampedIndex: number;
    onIndexChange: (index: number) => void;
    commentsOpen: boolean;
    onShowComments: () => void;
}

export function PostMediaColumn({ postKey, post, clampedIndex, onIndexChange, commentsOpen, onShowComments }: PostMediaColumnProps) {
    const t = useTranslations('PostModal');
    const tCard = useTranslations('PostCard');
    const authorDisplayName = isPlaylistDigestPost(post) ? tCard('playlistDigest') : post.author?.displayName ?? tCard('unknownAuthor');

    return (
        <div className="relative w-full h-full lg:col-span-3 bg-black">
            <PostMediaCarousel
                key={postKey}
                media={post.media}
                initialIndex={clampedIndex}
                onIndexChange={onIndexChange}
                alt={tCard('photoBy', { name: authorDisplayName })}
            />

            <div
                className={cn(
                    'lg:hidden absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent px-4 pt-12 pb-4 transition-opacity duration-200',
                    commentsOpen && 'opacity-0 pointer-events-none'
                )}
            >
                <button type="button" onClick={onShowComments} className="w-full text-left" aria-label={t('showComments')}>
                    <p className="text-sm font-semibold text-white mb-1">{authorDisplayName}</p>
                    {post.content && <p className="text-sm text-white/90 leading-snug line-clamp-2 mb-2">{post.content}</p>}
                    <div className="flex items-center gap-4">
                        <ReactionCount count={post.reactionCount} wrapperClassName="text-white/90" />
                        <CommentCount count={post.commentCount} wrapperClassName="text-white/90" />
                    </div>
                </button>
            </div>
        </div>
    );
}
