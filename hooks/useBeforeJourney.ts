'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useHelpProgress } from '@/hooks/useHelpProgress';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { formatDate } from '@/lib/datetime';
import { type JourneyChip, type JourneyStopModel, sessionsByPhase, sessionStates } from '@/lib/eventJourney';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { isLiteEvent } from '@/lib/liteEvents';
import { routes } from '@/lib/routes';

export type JourneyCounts = { memberCount: number; memberLimit: number | null; seatsClaimed: number | null };

type SetupStop = Omit<JourneyStopModel, 'status' | 'card'> & { complete: boolean; action: { label: string; href: string }; cardBody?: string };

/** The Before journey: setup stops in order, then sessions dated before the primary day. */
export function useBeforeJourney(event: EventDetailResponseDto, counts: JourneyCounts, now: Date = new Date()) {
    const t = useTranslations('HostOnboarding');
    const tj = useTranslations('ManagePage');
    const tr = useTranslations('RightContextPanel');
    const locale = useLocale();
    const moduleCopy = useModuleCopy(event.eventType);
    const sessions = (event.sessions ?? []).filter((item) => !item.deletedAt);
    const progress = useHelpProgress({ eventId: event.id, title: event.title, schedule: event.schedule, location: event.location, sessions });

    const hasVenueConvention = Boolean(getCreateEventCatalogEntry(event.eventType)?.secondarySessionTitleKey);
    const hasVenue = sessions.some((item) => item.isSecondary);
    const wishlistOn = event.modules.some((item) => item.moduleKey === 'wishlist' && item.isEnabled && item.isAvailable);
    const membersLine = counts.memberLimit === null ? undefined : tj('journey.members', { count: counts.memberCount, limit: counts.memberLimit });

    const settingsHref = routes.events.manage(event.id, { tab: 'settings' });
    const scheduleHref = routes.events.tools.schedule(event.id);
    const rsvpHref = routes.events.tools.rsvp(event.id);
    const giftHref = routes.events.tools.gifts(event.id);
    const qrHref = routes.events.invitationsQr(event.id);

    const rsvpChips: JourneyChip[] = event.rsvpSummary
        ? [
              { key: 'attending', label: `${event.rsvpSummary.attending} ${tr('rsvpSummary.attending')}`, tone: 'success' },
              { key: 'declined', label: `${event.rsvpSummary.declined} ${tr('rsvpSummary.declined')}`, tone: 'neutral' },
              { key: 'noResponse', label: `${event.rsvpSummary.noResponse} ${tr('rsvpSummary.noResponse')}`, tone: 'warn' },
              ...(counts.seatsClaimed === null ? [] : [{ key: 'seats', label: tj('journey.seats', { count: counts.seatsClaimed }), tone: 'neutral' as const }]),
          ]
        : [];

    const setup: (SetupStop | false)[] = [
        {
            key: 'details',
            title: t('steps.details.title'),
            icon: 'details',
            href: settingsHref,
            complete: progress.details,
            action: { label: t('steps.details.edit'), href: settingsHref },
            // The title already opens Settings, so "Edit event details" is its plain line (as on C1), not a second link.
            detail: t('steps.details.edit'),
            links: hasVenueConvention
                ? [
                      {
                          key: 'venue',
                          label: t(hasVenue ? 'steps.details.venueEdit' : 'steps.details.venueAdd'),
                          href: routes.events.tools.schedule(event.id, { section: 'venue-session' }),
                      },
                  ]
                : [],
        },
        isModuleAvailable(event.modules, 'rsvp') && {
            key: 'rsvp',
            title: moduleCopy('rsvp').name,
            icon: 'rsvp',
            href: rsvpHref,
            complete: progress.rsvp,
            action: { label: t('steps.rsvp.edit'), href: rsvpHref },
            chips: rsvpChips,
            links: progress.rsvp ? [] : [{ key: 'rsvp', label: t('steps.rsvp.edit'), href: rsvpHref }],
        },
        {
            key: 'schedule',
            title: moduleCopy('schedule').name,
            icon: 'schedule',
            href: scheduleHref,
            complete: progress.schedule,
            action: { label: t('steps.schedule.edit'), href: scheduleHref },
            cardBody: tj('journey.scheduleCard'),
            detail: progress.schedule ? tj('journey.sessions', { count: sessions.length }) : undefined,
            links: progress.schedule ? [] : [{ key: 'schedule', label: t('steps.schedule.edit'), href: scheduleHref }],
        },
        wishlistOn && {
            key: 'giftAccount',
            title: moduleCopy('wishlist').name,
            icon: 'gift',
            href: giftHref,
            complete: progress.giftAccount,
            action: { label: t('steps.giftAccount.edit'), href: giftHref },
            links: progress.giftAccount ? [] : [{ key: 'gifts', label: t('steps.giftAccount.edit'), href: giftHref }],
        },
        !isLiteEvent(event) && {
            key: 'invitations',
            title: t('steps.invitations.title'),
            icon: 'invitations',
            href: qrHref,
            complete: progress.invitations,
            action: { label: t('steps.invitations.qr'), href: qrHref },
            detail: membersLine,
            links: progress.invitations ? [] : [{ key: 'qr', label: t('steps.invitations.qr'), href: qrHref }],
        },
    ];

    const present = setup.filter((stop): stop is SetupStop => Boolean(stop));
    const currentIndex = present.findIndex((stop) => !stop.complete);
    const setupStops: JourneyStopModel[] = present.map(({ complete, action, cardBody, ...stop }, index) => {
        const status = complete ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        return { ...stop, status, card: status === 'current' ? { body: cardBody, action } : undefined };
    });

    const earlier = sessionsByPhase(event).before;
    const states = sessionStates(earlier, event.schedule.timezone, now);
    const sessionStops: JourneyStopModel[] = earlier.map((item, index) => ({
        key: `session-${item.id}`,
        title: item.title,
        icon: 'session',
        status: states[index] === 'done' ? 'done' : 'upcoming',
        href: scheduleHref,
        detail: item.startAt
            ? formatDate(locale, item.startAt, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: event.schedule.timezone,
              })
            : undefined,
    }));

    return { stops: [...setupStops, ...sessionStops], allDone: currentIndex === -1 };
}
