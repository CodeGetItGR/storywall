'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { FEED_MODULE_BUTTON, FeedModuleCard, FeedModuleTitle } from '@/components/feed/modules/FeedModuleCard';
import type { FeedWish } from '@/components/feed/modules/FeedWishCard';
import { FeedWishEmptyCard } from '@/components/feed/modules/FeedWishCard';
import { FeedWishCards } from '@/components/feed/modules/FeedWishCards';
import { AppLink } from '@/components/ui/AppLink';
import { cn } from '@/lib/utils';

export type FeedWishbookBlockProps = {
    name: string;
    wishes: readonly FeedWish[];
    loading: boolean;
    // Hosts read everyone's wishes and don't write; a guest reads their own.
    isHost: boolean;
    // null: no Write button (a host, or an event that can't take wishes now).
    writeHref: string | null;
    // null: nothing to list yet.
    listHref: string | null;
    total: number;
    // false: the event lost the wishbook; edit mode draws the empty look with the button off.
    available: boolean;
    underTools?: boolean;
};

// The feed's Wishbook block (KAN-299): look C1 with wishes, WE1 without.
export function FeedWishbookBlock({ name, wishes, loading, isHost, writeHref, listHref, total, available, underTools }: FeedWishbookBlockProps) {
    const t = useTranslations('FeedModuleBlocks');
    const showCards = available && wishes.length > 0;

    return (
        <FeedModuleCard underTools={underTools}>
            {/* Icon and title */}
            <div className="flex flex-col items-center gap-1">
                <Image src="/icons/modules/wishbook.svg" alt={name} width={40} height={40} className="h-10 w-10" unoptimized />
                <FeedModuleTitle>{name}</FeedModuleTitle>
            </div>

            {/* Cards, or the blank card */}
            {showCards ? <FeedWishCards wishes={wishes} /> : !loading && <FeedWishEmptyCard text={isHost ? t('wishNone') : t('wishWriteYours')} />}

            {/* Write */}
            {!available ? (
                <button type="button" disabled className={cn(FEED_MODULE_BUTTON, 'opacity-50')}>
                    {t('wishWrite')}
                </button>
            ) : (
                writeHref && (
                    <AppLink href={writeHref} className={FEED_MODULE_BUTTON}>
                        {t('wishWrite')}
                    </AppLink>
                )
            )}

            {/* All wishes */}
            {available && listHref && (
                <AppLink
                    href={listHref}
                    className="text-[14px] font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                    {isHost ? t('wishAll', { count: total }) : t('wishMine', { count: total })}
                </AppLink>
            )}
        </FeedModuleCard>
    );
}
