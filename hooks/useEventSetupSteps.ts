'use client';

import { useTranslations } from 'next-intl';

import type { HelpStepAction } from '@/components/manage/help/HelpStep';
import { useHelpProgress } from '@/hooks/useHelpProgress';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { isLiteEvent } from '@/lib/liteEvents';
import { routes } from '@/lib/routes';

export type EventSetupStep = { key: string; title: string; body?: string; complete: boolean; actions: HelpStepAction[] };

/** The host's setup steps for a live event, in order, each with its links. */
export function useEventSetupSteps(event: EventDetailResponseDto): EventSetupStep[] {
    const t = useTranslations('HostOnboarding');
    const moduleCopy = useModuleCopy(event.eventType);
    const sessions = event.sessions ?? [];
    const progress = useHelpProgress({ eventId: event.id, title: event.title, schedule: event.schedule, location: event.location, sessions });

    const hasVenueConvention = Boolean(getCreateEventCatalogEntry(event.eventType)?.secondarySessionTitleKey);
    const hasVenue = sessions.some((session) => session.isSecondary && !session.deletedAt);
    const enabledModuleKeys = new Set(event.modules.filter((module_) => module_.isEnabled && module_.isAvailable).map((module_) => module_.moduleKey));
    // A lite event takes no guests: they add photos and wishes through its guest code.
    const isLite = isLiteEvent(event);

    const detailsActions: HelpStepAction[] = [
        { key: 'settings', href: routes.events.manage(event.id, { tab: 'settings' }), label: t('steps.details.edit') },
    ];
    if (hasVenueConvention) {
        detailsActions.push({
            key: 'venue',
            href: routes.events.tools.schedule(event.id, { section: 'venue-session' }),
            label: t(hasVenue ? 'steps.details.venueEdit' : 'steps.details.venueAdd'),
        });
    }

    const steps: (EventSetupStep | false)[] = [
        { key: 'details', title: t('steps.details.title'), complete: progress.details, actions: detailsActions },
        isModuleAvailable(event.modules, 'rsvp') && {
            key: 'rsvp',
            title: moduleCopy('rsvp').name,
            complete: progress.rsvp,
            actions: [{ key: 'rsvp', href: routes.events.tools.rsvp(event.id), label: t('steps.rsvp.edit') }],
        },
        enabledModuleKeys.has('wishlist') && {
            key: 'giftAccount',
            title: moduleCopy('wishlist').name,
            complete: progress.giftAccount,
            actions: [{ key: 'gifts', href: routes.events.tools.gifts(event.id), label: t('steps.giftAccount.edit') }],
        },
        {
            key: 'schedule',
            title: moduleCopy('schedule').name,
            complete: progress.schedule,
            actions: [{ key: 'schedule', href: routes.events.tools.schedule(event.id), label: t('steps.schedule.edit') }],
        },
        !isLite && {
            key: 'invitations',
            title: t('steps.invitations.title'),
            body: t('steps.invitations.body'),
            complete: progress.invitations,
            actions: [{ key: 'qr', href: routes.events.invitationsQr(event.id), label: t('steps.invitations.qr') }],
        },
    ];
    return steps.filter((step): step is EventSetupStep => Boolean(step));
}
