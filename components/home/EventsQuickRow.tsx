'use client';

import { Heart, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { HomeHorizontalScroller } from '@/components/home/HomeHorizontalScroller';
import { EventQuickCardSkeleton, EventQuickCardsSkeleton } from '@/components/home/HomeSkeletons';
import { AppLink } from '@/components/ui/AppLink';
import type { EventGridItem } from '@/hooks/useEventGridItems';
import { useEventQuickCard } from '@/hooks/useEventQuickCard';
import type { EventCardStatus } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const STATUS_DOT_CLASS_NAME: Record<EventCardStatus, string> = {
    suspended: 'bg-status-danger',
    deleting: 'bg-status-danger',
    draft: 'bg-status-warn',
    ended: 'bg-ink-faint',
};

function EventQuickCard(item: EventGridItem) {
    const { href, coverUrl, title, detailLabel, status, statusLabel, dateLabel } = useEventQuickCard(item);

    return (
        <AppLink
            href={href}
            className="group relative h-72 w-52 shrink-0 overflow-hidden rounded-lg bg-surface-muted transition-transform hover:-translate-y-0.5"
        >
            {coverUrl ? (
                <ProtectedImage
                    src={coverUrl}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    sizes="208px"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-brand">
                    <Heart className="h-7 w-7 text-white/85" />
                </div>
            )}
            {/* Details */}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/85 via-ink/40 to-transparent px-3 pt-12 pb-3">
                {detailLabel ? (
                    <p className="truncate text-[10px] font-semibold tracking-wide text-white/70 uppercase">{detailLabel}</p>
                ) : null}
                <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-semibold text-white">{title}</p>
                {status || dateLabel ? (
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-white/75">
                        {status ? (
                            <>
                                <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT_CLASS_NAME[status])} />
                                <span className="shrink-0 font-semibold text-white">{statusLabel}</span>
                                {dateLabel ? <span aria-hidden="true">·</span> : null}
                            </>
                        ) : null}
                        {dateLabel ? <span className="truncate">{dateLabel}</span> : null}
                    </p>
                ) : null}
            </div>
        </AppLink>
    );
}

export function EventsQuickRow({
    items,
    isLoading = false,
    contentClassName,
    canCreateEvent = true,
}: {
    items: EventGridItem[];
    isLoading?: boolean;
    contentClassName?: string;
    canCreateEvent?: boolean;
}) {
    const t = useTranslations('HomePage');
    const tEvents = useTranslations('EventsPage');

    const onNewEventClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            if (!canCreateEvent) event.preventDefault();
        },
        [canCreateEvent],
    );

    return (
        <section aria-labelledby="home-events-heading" className="flex w-full flex-col gap-3">
            {/* Section heading */}
            <div className={cn('flex items-center justify-between gap-3 px-4', contentClassName)}>
                <h2 id="home-events-heading" className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
                    {tEvents('yourEvents')}
                </h2>
                <AppLink
                    href={canCreateEvent ? routes.events.new() : '#'}
                    aria-disabled={!canCreateEvent}
                    onClick={onNewEventClick}
                    className={cn(
                        'inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark ring-1 ring-primary/12 transition-colors hover:bg-accent',
                        !canCreateEvent && 'pointer-events-none opacity-40',
                    )}
                >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    <span>{t('newEvent')}</span>
                </AppLink>
            </div>

            {/* Event shortcuts */}
            <HomeHorizontalScroller previousLabel={tEvents('previous')} nextLabel={tEvents('next')} className={contentClassName}>
                {isLoading ? (
                    <EventQuickCardsSkeleton />
                ) : (
                    items.map((item) =>
                        item.isLoading ? (
                            <EventQuickCardSkeleton key={item.member.eventId} />
                        ) : (
                            <EventQuickCard key={item.member.eventId} {...item} />
                        ),
                    )
                )}
            </HomeHorizontalScroller>
        </section>
    );
}
