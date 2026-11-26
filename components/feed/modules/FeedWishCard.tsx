'use client';

import { useLocale } from 'next-intl';

import { VoiceWishPlayer } from '@/components/wishbook/VoiceWishPlayer';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { wishCardTone } from '@/lib/feedModuleContent';
import { cn } from '@/lib/utils';

export type FeedWish = Pick<WishbookEntryResponseDto, 'id' | 'guestName' | 'message' | 'audio' | 'createdAt'>;

// One quote card of look C1: the wish, its recording, and who wrote it when.
export function FeedWishCard({ wish, index }: { wish: FeedWish; index: number }) {
    const locale = useLocale();
    return (
        <figure className={cn('flex h-full flex-col items-center justify-center gap-3 rounded-2xl px-5 py-5', wishCardTone(index))}>
            {/* Quote mark */}
            <span aria-hidden="true" className="font-editorial text-[40px] leading-[0.6] text-primary">
                &ldquo;
            </span>

            {/* Wish */}
            {wish.message && (
                <blockquote className="line-clamp-6 font-editorial text-[20px] leading-snug wrap-break-word whitespace-pre-wrap text-ink italic">
                    {wish.message}
                </blockquote>
            )}

            {/* Recording */}
            {wish.audio && <VoiceWishPlayer src={wish.audio.url} durationMs={wish.audio.durationMs} />}

            {/* Name and date */}
            <figcaption className="text-[13px] text-ink-muted">
                {wish.guestName} ·{' '}
                <time dateTime={wish.createdAt}>{formatDate(locale, wish.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</time>
            </figcaption>
        </figure>
    );
}

// The blank dashed card (WE1): no wishes to show yet.
export function FeedWishEmptyCard({ text }: { text: string }) {
    return (
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#e8dccf] bg-[#faf6f1] px-5 py-6">
            <span aria-hidden="true" className="font-editorial text-[40px] leading-[0.6] text-primary">
                &ldquo;
            </span>
            <p className="font-editorial text-[20px] text-ink-muted italic">{text}</p>
        </div>
    );
}
