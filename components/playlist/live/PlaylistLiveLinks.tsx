'use client';

import { useTranslations } from 'next-intl';

import { SpotifyMark, YouTubeMark } from '@/components/playlist/MusicServiceMarks';
import { cn } from '@/lib/utils';

const LINK = 'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors focus-ring';

// The song on Spotify and YouTube, when the guest added them, on one line with just the source's name. Nothing when
// neither is there.
export function PlaylistLiveLinks({
    spotifyUrl,
    youtubeUrl,
    className,
}: {
    spotifyUrl: string | null;
    youtubeUrl: string | null;
    className?: string;
}) {
    const t = useTranslations('PlaylistPage');
    const tLive = useTranslations('Vendors.live');

    if (!spotifyUrl && !youtubeUrl) return null;

    return (
        <div className={cn('flex gap-2', className)}>
            {spotifyUrl && (
                <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('openSpotify')}
                    className={cn(LINK, 'bg-[#1DB954]/12 text-[#117a37] hover:bg-[#1DB954]/20')}
                >
                    <SpotifyMark className="size-4" />
                    {tLive('spotify')}
                </a>
            )}
            {youtubeUrl && (
                <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('openYouTube')}
                    className={cn(LINK, 'bg-[#FF0000]/8 text-[#c4000b] hover:bg-[#FF0000]/14')}
                >
                    <YouTubeMark className="size-4" />
                    {tLive('youtube')}
                </a>
            )}
        </div>
    );
}
