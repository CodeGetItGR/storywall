'use client';

import { Heart, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { HomeHorizontalScroller } from '@/components/home/HomeHorizontalScroller';
import type { EventGridItem } from '@/hooks/useEventGridItems';
import { formatEventListDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

function QuickRowSkeleton() {
    return <div className="h-52 w-40 shrink-0 animate-pulse rounded-2xl bg-surface-muted lg:h-56 lg:w-40" />;
}

function EventQuickCard({ member, event }: EventGridItem) {
    const tEvents = useTranslations('EventsPage');
    const locale = useLocale();

    const roleLabel =
        member.customRelationshipRole ??
        member.relationshipRole ??
        (member.role === 'HOST' ? tEvents('roleFallback.host') : tEvents('roleFallback.attendee'));
    const eventDate = formatEventListDate(event?.schedule.startAt, locale, tEvents('dateAt'));

    return (
        <Link
            href={routes.events.feed(member.eventId)}
            className="group relative h-62 w-44 shrink-0 overflow-hidden rounded-lg bg-surface-muted transition-transform hover:-translate-y-0.5 lg:h-56 lg:w-40"
        >
            {event?.coverMedia?.mediaUrl ? (
                <Image
                    src={event.coverMedia.mediaUrl}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    sizes="160px"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-brand">
                    <Heart className="h-7 w-7 text-white/85" />
                </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/85 via-ink/35 to-transparent px-3 pt-8 pb-3">
                <p className="truncate text-sm font-semibold text-white">{event?.title ?? tEvents('eventUnavailable')}</p>
                <p className="mt-0.5 truncate text-xs text-white/75">{eventDate ?? roleLabel}</p>
            </div>
        </Link>
    );
}

export function EventsQuickRow({
    items,
    isLoading = false,
    contentClassName,
}: {
    items: EventGridItem[];
    isLoading?: boolean;
    contentClassName?: string;
}) {
    const t = useTranslations('HomePage');
    const tEvents = useTranslations('EventsPage');

    return (
        <section aria-labelledby="home-events-heading" className="flex w-full flex-col gap-3">
            {/* Section heading */}
            <div className={cn('flex items-center justify-between gap-3 px-4', contentClassName)}>
                <h2 id="home-events-heading" className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {tEvents('yourEvents')}
                </h2>
                <Link
                    href={routes.events.new()}
                    className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark ring-1 ring-primary/12 transition-colors hover:bg-accent"
                >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    <span>{t('newEvent')}</span>
                </Link>
            </div>

            {/* Event shortcuts */}
            <HomeHorizontalScroller
                previousLabel={tEvents('previous')}
                nextLabel={tEvents('next')}
                className={contentClassName}
            >
                {isLoading
                    ? [0, 1, 2].map((key) => <QuickRowSkeleton key={key} />)
                    : items.map((item) =>
                          item.isLoading ? <QuickRowSkeleton key={item.member.eventId} /> : <EventQuickCard key={item.member.eventId} {...item} />
                      )}
            </HomeHorizontalScroller>
        </section>
    );
}
