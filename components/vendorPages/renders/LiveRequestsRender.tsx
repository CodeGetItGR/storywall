import { Check, ThumbsUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { SpotifyMark, YouTubeMark } from '@/components/playlist/MusicServiceMarks';
import { cn } from '@/lib/utils';

const VOTES = [24, 17, 9];
const LINK = 'inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-muted';

// The DJ's live list, with sample songs. Same look as PlaylistLiveCard, which needs a signed-in event.
export async function LiveRequestsRender() {
    const t = await getTranslations('Vendors.live');
    const tSamples = await getTranslations('VendorPages.renders.live');
    const songs = (tSamples.raw('songs') as { title: string; artist: string }[]).map((song, index) => ({ ...song, votes: VOTES[index] }));

    return (
        <div className="min-h-full bg-background p-4">
            {/* Title */}
            <p className="m-0 mb-4 text-xl font-bold text-ink">{t('title')}</p>

            {/* Songs */}
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {songs.map(({ title, artist, votes }, index) => (
                    <li key={title} className={cn('rounded-[1.5rem] bg-card p-4 shadow-xs ring-1', index === 0 ? 'ring-primary/40' : 'ring-ink/5')}>
                        <div className="flex items-start gap-3.5">
                            {/* Position */}
                            <span
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                                    index === 0 ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-ink-muted',
                                )}
                            >
                                {index + 1}
                            </span>

                            {/* Song */}
                            <div className="min-w-0 flex-1">
                                <p className="m-0 text-base leading-snug font-semibold text-ink">{title}</p>
                                <p className="m-0 mt-0.5 text-sm text-ink-muted">{artist}</p>
                                <p className="m-0 mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted tabular-nums">
                                    <ThumbsUp className="size-3.5" />
                                    {t('votes', { count: votes })}
                                </p>
                            </div>

                            {/* Played */}
                            <span className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-semibold text-white">
                                <Check className="size-4" />
                                {t('played')}
                            </span>
                        </div>

                        {/* Links */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className={LINK}>
                                <SpotifyMark className="h-4 w-4" />
                                {t('spotify')}
                            </span>
                            <span className={LINK}>
                                <YouTubeMark className="h-4 w-4" />
                                {t('youtube')}
                            </span>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}
