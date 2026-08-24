'use client';

import { Eye, Music } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { StoryResponseDto } from '@/lib/api/types';

export function StoryCaptionBar({
    story,
    canManage,
    onShowViewersAction,
}: {
    story: StoryResponseDto;
    canManage: boolean;
    onShowViewersAction: () => void;
}) {
    const t = useTranslations('StoryPage');

    if (!story.caption && !story.songUrl && !canManage) return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-12 bg-linear-to-t from-black/70 to-transparent flex flex-col gap-2">
            {story.caption && <p className="text-white text-sm">{story.caption}</p>}
            {story.songUrl && (
                <a href={story.songUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white/80 text-xs w-fit">
                    <Music className="w-3.5 h-3.5" />
                    {t('listenToSong')}
                </a>
            )}
            {canManage && (
                <button type="button" onClick={onShowViewersAction} className="inline-flex items-center gap-1.5 text-white/80 text-xs w-fit">
                    <Eye className="w-3.5 h-3.5" />
                    {t('viewedBy')}
                </button>
            )}
        </div>
    );
}
