'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { ModulePreviewFrame, type ModulePreviewProps } from '@/components/home/modulePreviews/previewFrame';
import Avatar from '@/components/ui/avatar';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

/** Replica of the story viewer — components/story/StoryModal.tsx with StoryProgressBar, StoryHeader and StoryCaptionBar. */
export function StoriesPreview({ variant }: ModulePreviewProps) {
    const t = useTranslations('HomePage');
    const authorName = t('modules.preview.guestName');

    return (
        <ModulePreviewFrame variant={variant} surfaceClassName="bg-black">
            <div className="relative h-96 w-full overflow-hidden bg-black">
                {/* Story media */}
                <Image src="/images/post-flowers.png" alt="" fill className="object-cover" sizes="320px" />

                {/* Progress */}
                <div className="absolute top-3 right-3 left-3 z-30 flex gap-1">
                    <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                        <div className="h-full rounded-full bg-white" style={{ width: '100%' }} />
                    </div>
                    <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                        <div className="h-full rounded-full bg-white" style={{ width: '45%' }} />
                    </div>
                    <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                        <div className="h-full rounded-full bg-white" style={{ width: '0%' }} />
                    </div>
                </div>

                {/* Author */}
                <div className="absolute top-6 right-0 left-0 z-20 flex items-center justify-between px-4 pt-2">
                    <div className="flex items-center gap-2.5">
                        <Avatar
                            initials={initialsFromName(authorName)}
                            color={avatarColorFromId(authorName)}
                            size="sm"
                            alt={authorName}
                            className="border-2 border-white/60"
                        />
                        <div>
                            <p className="text-sm leading-tight font-semibold text-white">{authorName}</p>
                            <p className="text-xs leading-tight text-white/60">{t('modules.preview.storyTime')}</p>
                        </div>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white">
                        <X className="h-4 w-4" />
                    </span>
                </div>

                {/* Caption */}
                <div className="absolute right-0 bottom-0 left-0 z-20 flex flex-col gap-2 bg-linear-to-t from-black/70 to-transparent px-4 pt-12 pb-6">
                    <p className="text-sm text-white">{t('modules.preview.storyCaption')}</p>
                </div>
            </div>
        </ModulePreviewFrame>
    );
}
