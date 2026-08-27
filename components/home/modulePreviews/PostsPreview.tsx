'use client';

import { MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { PostAuthorAvatar, ReactionCount } from '@/components/feed/post';
import { ModulePreviewFrame, type ModulePreviewProps } from '@/components/home/modulePreviews/previewFrame';

/** Replica of components/feed/PostCard.tsx — a host post with two photos, liked, plus the next post starting. */
export function PostsPreview({ variant }: ModulePreviewProps) {
    const t = useTranslations('HomePage');
    const hostName = t('modules.preview.hostName');
    const guestName = t('modules.preview.guestName');

    return (
        <ModulePreviewFrame variant={variant} surfaceClassName="bg-card">
            {/* Host post */}
            <article className="relative border-b border-border/60 bg-card/60">
                {/* Author */}
                <div className="flex items-center justify-between px-2 pt-4 pb-3">
                    <PostAuthorAvatar name={hostName} timeAgo={{ unit: 'hours', value: 2 }} isHostPost />
                </div>

                {/* Text */}
                <div className="px-4 pb-3">
                    <p className="text-sm leading-relaxed text-ink">{t('modules.preview.postText')}</p>
                </div>

                {/* Media */}
                <div className="grid grid-cols-2 gap-0.5 bg-surface-muted">
                    <div className="relative block aspect-square overflow-hidden">
                        <Image src="/images/post-cake.png" alt="" fill className="object-cover" sizes="160px" />
                    </div>
                    <div className="relative block aspect-square overflow-hidden">
                        <Image src="/images/post-florals.png" alt="" fill className="object-cover" sizes="160px" />
                    </div>
                </div>

                {/* Reactions */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-1">
                        <span className="flex items-center gap-1.5 rounded-full bg-primary-light px-3.5 py-2 text-sm font-medium text-primary">
                            <ReactionCount count={24} iconClassName="fill-primary text-primary" iconStrokeWidth={0} />
                        </span>
                        <span className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-muted">
                            <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
                            <span className="tabular-nums">6</span>
                        </span>
                    </div>
                </div>
            </article>

            {/* Next post */}
            <article className="relative border-b border-border/60 bg-card/60">
                <div className="flex items-center justify-between px-2 pt-4 pb-3">
                    <PostAuthorAvatar name={guestName} timeAgo={{ unit: 'hours', value: 5 }} />
                </div>
                <div className="px-4 pb-3">
                    <p className="text-sm leading-relaxed text-ink">{t('modules.preview.postReply')}</p>
                </div>
            </article>
        </ModulePreviewFrame>
    );
}
