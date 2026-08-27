'use client';

import { CalendarDays, ChevronRight, Heart, UsersRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { EventListItemSkeleton } from '@/components/events/EventListItemSkeleton';
import Avatar from '@/components/ui/avatar';
import { useEventMembers } from '@/hooks';
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { formatEventListDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';
import { avatarColorFromId, cn, initialsFromName } from '@/lib/utils';

interface EventListItemProps {
    eventId: string;
    member: EventMemberResponseDto;
    event: EventDetailResponseDto | undefined;
    isLoading: boolean;
}

export function EventListItem({ eventId, member, event, isLoading }: EventListItemProps) {
    const t = useTranslations('EventsPage');
    const locale = useLocale();
    const { data: eventMembers = [] } = useEventMembers(eventId);

    const roleLabel =
        member.customRelationshipRole ?? member.relationshipRole ?? (member.role === 'HOST' ? t('roleFallback.host') : t('roleFallback.attendee'));
    const displayMembers = useMemo(() => {
        const members = eventMembers.length > 0 ? eventMembers : [member];
        return members.slice(0, 3);
    }, [eventMembers, member]);
    const goingCount = event?.rsvpSummary.attending ?? event?.rsvpSummary.totalMembers ?? displayMembers.length;
    const extraMemberCount = Math.max(goingCount - displayMembers.length, 0);
    const eventDate = formatEventListDate(event?.schedule.startAt, locale, t('dateAt'));

    if (isLoading) {
        return <EventListItemSkeleton />;
    }

    return (
        <Link
            href={routes.post.feed(eventId)}
            className="group block overflow-hidden rounded-2xl bg-card shadow-[0_10px_30px_rgba(36,31,26,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(36,31,26,0.12)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
            <div className="relative aspect-video w-full overflow-hidden bg-surface-muted">
                {event?.coverMedia?.mediaUrl ? (
                    <Image
                        src={event.coverMedia.mediaUrl}
                        alt={event.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, 672px"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-brand">
                        <Heart className="h-8 w-8 text-white/85" />
                    </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-ink/30 to-transparent" />
            </div>

            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {eventDate && <p className="text-[11px] font-semibold tracking-wide text-ink-muted">{eventDate}</p>}
                        <h3 className="mt-1 truncate text-base font-bold leading-tight text-ink">{event?.title ?? t('eventUnavailable')}</h3>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                </div>

                <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                    <span className="truncate">{roleLabel}</span>
                    <span aria-hidden="true" className={cn('text-ink-faint', !goingCount && 'hidden')}>
                        |
                    </span>
                    {goingCount > 0 && <span className="shrink-0">{t('goingCount', { count: goingCount })}</span>}
                </p>

                {member.role === 'HOST' && (
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center">
                            {displayMembers.map((eventMember) => (
                                <Avatar
                                    key={eventMember.id}
                                    initials={initialsFromName(eventMember.displayName)}
                                    color={avatarColorFromId(eventMember.id)}
                                    size="xs"
                                    alt={eventMember.displayName}
                                    className="-ml-2 first:ml-0 ring-2 ring-card"
                                />
                            ))}
                            {extraMemberCount > 0 && (
                                <span className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-[10px] font-semibold text-ink-muted ring-2 ring-card">
                                    +{extraMemberCount}
                                </span>
                            )}
                        </div>
                        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-muted px-2.5 text-xs font-medium text-ink-muted">
                            <UsersRound className="h-3.5 w-3.5" strokeWidth={1.8} />
                            {event?.rsvpSummary.totalMembers ?? displayMembers.length}
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );
}
