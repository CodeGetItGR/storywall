import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { YouTubeMark } from '@/components/playlist/MusicServiceMarks';
import { QR_JOIN_PREVIEW_SONG_VOTES } from '@/lib/qrLanding';

// The floating cards around the join preview's phone (KAN-213). Each copies the app's own card at full size
// (the wishbook entry, the playlist song); the preview scales them down, as it does the feed.

const CARD_SHADOW = 'shadow-[0_24px_40px_-18px_rgba(40,20,10,0.45)]';

export function QrPreviewWishCard() {
    const t = useTranslations('QrCodePage');
    const tWishbook = useTranslations('WishbookPage');

    return (
        <article className={`w-[300px] overflow-hidden rounded-[1.5rem] bg-background ${CARD_SHADOW}`}>
            <div className="bg-surface-muted/70 px-4 py-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{t('preview.wishAuthor')}</p>
                    <span className="inline-flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-ink-faint">
                        {tWishbook('reportEntry')}
                    </span>
                </div>

                {/* Message */}
                <p className="mt-1 text-sm leading-6 text-ink">{t('preview.wishText')}</p>
            </div>
        </article>
    );
}

export function QrPreviewSongCard() {
    const t = useTranslations('QrCodePage');
    const tPlaylist = useTranslations('PlaylistPage');

    return (
        <article className={`w-[300px] rounded-[1.5rem] bg-background px-4 py-3.5 ${CARD_SHADOW}`}>
            {/* Details */}
            <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold text-ink">{t('preview.songTitle')}</h3>
                <span className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-1 text-primary-dark">
                    <YouTubeMark className="h-3.5 w-3.5" />
                </span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{t('preview.songArtist')}</p>

            {/* Link and votes */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium whitespace-nowrap text-ink-muted">
                    <YouTubeMark className="h-4 w-4" />
                    {tPlaylist('openYouTube')}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-ink-faint">
                    <span className="flex items-center gap-1 rounded-2xl bg-primary-light px-2 py-1.5 text-primary">
                        <ThumbsUp className="h-4 w-4 fill-primary" strokeWidth={0} aria-hidden="true" />
                        <span className="text-[11px] font-bold tabular-nums">{QR_JOIN_PREVIEW_SONG_VOTES.up}</span>
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1.5">
                        <ThumbsDown className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        <span className="text-[11px] font-bold tabular-nums">{QR_JOIN_PREVIEW_SONG_VOTES.down}</span>
                    </span>
                </span>
            </div>
        </article>
    );
}
