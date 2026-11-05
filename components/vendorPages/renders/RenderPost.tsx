import { Heart, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { PostAuthorAvatar } from '@/components/feed/post/PostAuthorAvatar';
import { ReactionSummary } from '@/components/feed/post/ReactionSummary';
import { RoleChip } from '@/components/memberRoles/RoleChip';
import type { ReactionTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const REACTION_TYPES = [
    { code: 'LOVE', emoji: '❤️', sortOrder: 0 },
    { code: 'CLAP', emoji: '👏', sortOrder: 1 },
] as ReactionTypeResponseDto[];
const REACTION_COUNTS = { LOVE: 18, CLAP: 6 };

type RenderPostProps = {
    author: string;
    role: string;
    body: string;
    label?: ReactNode;
    photos?: { src: string; alt: string }[];
    tinted?: boolean;
};

// A post in the feed with sample content. Same look as PostCard, which needs a signed-in event.
export function RenderPost({ author, role, body, label, photos = [], tinted = false }: RenderPostProps) {
    return (
        <div className={cn('border-b border-event-card-line', tinted ? 'bg-linear-to-b from-primary/12 to-primary/5' : 'bg-card')}>
            {/* Label */}
            {label && <div className="px-4 pt-4">{label}</div>}

            {/* Author */}
            <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-3">
                <PostAuthorAvatar name={author} timeAgo={{ unit: 'hours', value: 2 }} roleChip={<RoleChip label={role} />} />
            </div>

            {/* Text */}
            <div className="px-4 pb-3">
                <p className="m-0 text-base leading-relaxed font-medium text-ink">{body}</p>
            </div>

            {/* Photos */}
            {photos.length > 0 && (
                <div className={cn('grid gap-0.5', photos.length > 1 && 'grid-cols-2')}>
                    {photos.map(({ src, alt }) => (
                        <div key={src} className={cn('relative bg-surface-muted', photos.length > 1 ? 'aspect-square' : 'aspect-4/3')}>
                            <Image src={src} alt={alt} fill sizes={photos.length > 1 ? '120px' : '240px'} className="object-cover" />
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 text-sm font-medium text-ink-muted">
                    <span className="flex min-h-10 items-center px-1.5 py-2">
                        <Heart className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <span className="flex min-h-10 items-center gap-1.5 px-1.5 py-2">
                        <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
                        <span className="tabular-nums">3</span>
                    </span>
                </div>
                <span className="flex min-h-10 items-center px-1.5 py-2">
                    <ReactionSummary counts={REACTION_COUNTS} reactionTypes={REACTION_TYPES} />
                </span>
            </div>
        </div>
    );
}
