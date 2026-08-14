'use client';

import { CalendarHeart, Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { useEventDetails } from '@/hooks/useEvent';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { formatEventListDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface CompactEventListProps {
    activeEventId: string | null;
    eventQueries: ReturnType<typeof useEventDetails>;
    isLoading: boolean;
    memberships: EventMemberResponseDto[];
    onSelect: (eventId: string) => void;
}

export function CompactEventList({ activeEventId, eventQueries, isLoading, memberships, onSelect }: CompactEventListProps) {
    const locale = useLocale();
    const t = useTranslations('ProfilePage');

    function handleSelect(event: MouseEvent<HTMLAnchorElement>) {
        const eventId = event.currentTarget.dataset.eventId;
        if (eventId) onSelect(eventId);
    }

    if (isLoading) {
        return (
            <div className="space-y-2" aria-label={t('loadingEvents')}>
                {[0, 1, 2].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
                ))}
            </div>
        );
    }

    if (memberships.length === 0) {
        return (
            <div className="rounded-2xl bg-surface-muted px-4 py-6 text-center">
                <CalendarHeart className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-ink">{t('emptyMemberships.title')}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('emptyMemberships.body')}</p>
                <Link
                    href={routes.events.new}
                    className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gradient-brand px-5 text-sm font-semibold text-white"
                >
                    {t('emptyMemberships.cta')}
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {memberships.map((membership, index) => {
                const event = eventQueries[index]?.data;
                const isActive = membership.eventId === activeEventId;
                const role =
                    membership.customRelationshipRole ??
                    membership.relationshipRole ??
                    (membership.role === 'HOST' ? t('roleFallback.host') : t('roleFallback.attendee'));
                const eventDate = formatEventListDate(event?.schedule.startAt, locale, t('dateAt'));

                return (
                    <Link
                        key={membership.eventId}
                        href={routes.post.feed(membership.eventId)}
                        data-event-id={membership.eventId}
                        onClick={handleSelect}
                        className={cn(
                            'flex min-h-16 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                            isActive ? 'border-primary/30 bg-primary-light' : 'border-border bg-background hover:bg-surface-muted'
                        )}
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">{event?.title ?? t('eventUnavailable')}</p>
                            <p className="mt-0.5 truncate text-xs text-ink-muted">{eventDate ? `${role} · ${eventDate}` : role}</p>
                        </div>
                        {isActive ? (
                            <Check className="h-5 w-5 shrink-0 text-primary-dark" aria-label={t('activeEvent')} />
                        ) : (
                            <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint" aria-hidden="true" />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
