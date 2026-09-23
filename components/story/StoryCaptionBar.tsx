'use client';

import { Music } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { StoryResponseDto } from '@/lib/api/types';

export function StoryCaptionBar({ story }: { story: StoryResponseDto }) {
    const t = useTranslations('StoryPage');

    if (!story.caption && !story.songUrl) return null;

    return (
        <div className="absolute right-0 bottom-0 left-0 z-20 flex flex-col gap-2 bg-linear-to-t from-black/70 to-transparent px-4 pt-12 pb-6">
            {story.caption && <p className="text-sm text-white">{story.caption}</p>}
            {story.songUrl && (
                <a href={story.songUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-xs text-white/80">
                    <Music className="h-3.5 w-3.5" />
                    {t('listenToSong')}
                </a>
            )}
        </div>
    );
}
