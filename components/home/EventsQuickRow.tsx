'use client';

import { Heart, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import type { EventGridItem } from '@/hooks/useEventGridItems';
import { formatEventListDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

function QuickRowSkeleton() {
    return <div className="h-52 w-40 shrink-0 animate-pulse rounded-2xl bg-surface-muted" />;
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
            href={routes.post.feed(member.eventId)}
            className="group relative h-52 w-40 shrink-0 overflow-hidden rounded-2xl bg-surface-muted transition-transform hover:-translate-y-0.5"
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

export function EventsQuickRow({ items, isLoading = false }: { items: EventGridItem[]; isLoading?: boolean }) {
    const t = useTranslations('HomePage');
    const tEvents = useTranslations('EventsPage');

    return (
        <section aria-labelledby="home-events-heading" className="flex flex-col gap-3">
            <h2 id="home-events-heading" className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {tEvents('yourEvents')}
            </h2>
            <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-2">
                {/* Create event */}
                <Link
                    href={routes.events.new}
                    className="flex h-52 w-40 shrink-0 flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-ink-faint text-ink-faint transition-colors hover:border-ink-muted hover:text-ink-muted"
                >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted">
                        <Plus className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <span className="text-sm font-medium">{t('newEvent')}</span>
                </Link>

                {isLoading
                    ? [0, 1, 2].map((key) => <QuickRowSkeleton key={key} />)
                    : items.map((item) =>
                          item.isLoading ? <QuickRowSkeleton key={item.member.eventId} /> : <EventQuickCard key={item.member.eventId} {...item} />
                      )}
            </div>
        </section>
    );
}
