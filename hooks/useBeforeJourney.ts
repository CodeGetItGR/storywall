'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useHelpProgress } from '@/hooks/useHelpProgress';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { formatDate } from '@/lib/datetime';
import { eventCapabilities } from '@/lib/eventCapabilities';
import { type JourneyChip, type JourneyStopModel, journeyTimeZone, sessionsByPhase, sessionStates, setupStepKeys } from '@/lib/eventJourney';
import { routes } from '@/lib/routes';

export type JourneyCounts = { memberCount: number; memberLimit: number | null; seatsClaimed: number | null };

type SetupAction = { label: string; href: string };

// `detail` and `links` hold only what isn't the action. `actionLine` says where the action shows
// while the stop isn't current: as its plain line, as a link under it, or nowhere.
type SetupStop = Omit<JourneyStopModel, 'status' | 'card' | 'highlight'> & {
    complete: boolean;
    action: SetupAction;
    actionLine: 'detail' | 'link' | null;
    cardBody?: string;
};

/**
 * A setup stop's lines. The current stop puts its action in the coral line (as on C1) and keeps
 * the rest, since its card's button says the action too; other stops show it in `actionLine`.
 */
function setupLines(
    { detail, links = [], action, actionLine }: SetupStop,
    current: boolean,
): Pick<JourneyStopModel, 'highlight' | 'detail' | 'links'> {
    if (current) return { highlight: action.label, detail, links };
    if (actionLine === 'detail') return { detail: action.label, links };
    if (actionLine === 'link') return { detail, links: [...links, { key: 'action', ...action }] };
    return { detail, links };
}

/** The Before journey: setup stops in order, then sessions dated before the primary day. */
export function useBeforeJourney(event: EventDetailResponseDto, counts: JourneyCounts, now: Date = new Date()) {
    const t = useTranslations('HostOnboarding');
    const tj = useTranslations('ManagePage');
    const tr = useTranslations('RightContextPanel');
    const locale = useLocale();
    const moduleCopy = useModuleCopy(event.eventType);
    const sessions = (event.sessions ?? []).filter((item) => !item.deletedAt);
    const progress = useHelpProgress({ eventId: event.id, title: event.title, schedule: event.schedule, location: event.location, sessions, showsDetails: eventCapabilities(event)?.showsDetailsSettings ?? true });

    // A lite event takes no guests, so it has no schedule or venue session to set up.
    const takesGuests = eventCapabilities(event)?.takesGuests ?? true;
    const hasVenueConvention = takesGuests && Boolean(getCreateEventCatalogEntry(event.eventType)?.secondarySessionTitleKey);
    const hasVenue = sessions.some((item) => item.isSecondary);
    // The same stop list the floating Overview button counts (KAN-236).
    const present = new Set(setupStepKeys(event));
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
              ...(counts.seatsClaimed === null
                  ? []
                  : [{ key: 'seats', label: tj('journey.seats', { count: counts.seatsClaimed }), tone: 'neutral' as const }]),
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
            actionLine: 'detail',
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
        present.has('rsvp') && {
            key: 'rsvp',
            title: moduleCopy('rsvp').name,
            icon: 'rsvp',
            href: rsvpHref,
            complete: progress.rsvp,
            action: { label: t('steps.rsvp.edit'), href: rsvpHref },
            actionLine: progress.rsvp ? null : 'link',
            chips: rsvpChips,
        },
        present.has('schedule') && {
            key: 'schedule',
            title: moduleCopy('schedule').name,
            icon: 'schedule',
            href: scheduleHref,
            complete: progress.schedule,
            action: { label: t('steps.schedule.edit'), href: scheduleHref },
            cardBody: tj('journey.scheduleCard'),
            actionLine: progress.schedule ? null : 'link',
            detail: progress.schedule ? tj('journey.sessions', { count: sessions.length }) : undefined,
        },
        present.has('giftAccount') && {
            key: 'giftAccount',
            title: moduleCopy('wishlist').name,
            icon: 'gift',
            href: giftHref,
            complete: progress.giftAccount,
            action: { label: t('steps.giftAccount.edit'), href: giftHref },
            actionLine: progress.giftAccount ? null : 'link',
        },
        present.has('invitations') && {
            key: 'invitations',
            title: t('steps.invitations.title'),
            icon: 'invitations',
            href: qrHref,
            complete: progress.invitations,
            action: { label: t('steps.invitations.qr'), href: qrHref },
            actionLine: progress.invitations ? null : 'link',
            detail: membersLine,
        },
    ];

    const shown = setup.filter((stop): stop is SetupStop => Boolean(stop));
    const currentIndex = shown.findIndex((stop) => !stop.complete);
    const setupStops: JourneyStopModel[] = shown.map((stop, index) => {
        const { complete, action, actionLine: _actionLine, cardBody, ...rest } = stop;
        const status = complete ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        const current = status === 'current';
        return { ...rest, ...setupLines(stop, current), status, card: current ? { body: cardBody, action } : undefined };
    });

    const earlier = sessionsByPhase(event).before;
    const states = sessionStates(earlier, journeyTimeZone(event), now);
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
                  timeZone: journeyTimeZone(event),
              })
            : undefined,
    }));

    return { stops: [...setupStops, ...sessionStops], allDone: currentIndex === -1 };
}
