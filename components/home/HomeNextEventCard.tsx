'use client';

import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import type { EventGridItem } from '@/hooks/useEventGridItems';
import { useRecentEventItems } from '@/hooks/useEventGridItems';
import { formatEventListDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

export function HomeNextEventCard({ items }: { items: EventGridItem[] }) {
    const t = useTranslations('HomePage');
    const tEvents = useTranslations('EventsPage');
    const locale = useLocale();
    const [next] = useRecentEventItems(items, 1);

    if (!next || next.isLoading || !next.event) return null;

    const { event, member } = next;
    const roleLabel =
        member.customRelationshipRole ??
        member.relationshipRole ??
        (member.role === 'HOST' ? tEvents('roleFallback.host') : tEvents('roleFallback.attendee'));
    const dateLabel = formatEventListDate(event.schedule.startAt, locale, tEvents('dateAt')) ?? roleLabel;

    return (
        <section aria-labelledby="home-next-event-heading" className="flex flex-col gap-3">
            <h2 id="home-next-event-heading" className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t('nextEvent.title')}
            </h2>
            <Link
                href={routes.events.feed(member.eventId)}
                className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card/60 transition-colors hover:border-ink-muted"
            >
                {event.coverMedia?.mediaUrl && (
                    <div className="relative aspect-video w-full overflow-hidden bg-surface-muted">
                        <Image
                            src={event.coverMedia.mediaUrl}
                            alt=""
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            sizes="(max-width: 640px) 100vw, 640px"
                        />
                    </div>
                )}
                <div className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{event.title}</p>
                        <p className="truncate text-xs text-ink-muted">{dateLabel}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                </div>
            </Link>
        </section>
    );
}
