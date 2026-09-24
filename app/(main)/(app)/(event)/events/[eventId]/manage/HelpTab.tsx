'use client';

import { useTranslations } from 'next-intl';

import { HelpStep, type HelpStepAction } from '@/components/manage/help/HelpStep';
import { HelpStepper } from '@/components/manage/help/HelpStepper';
import { useHelpProgress } from '@/hooks/useHelpProgress';
import type { EventLocationDto, EventModuleResponseDto, EventScheduleDto, EventSessionResponseDto, EventTypeConvention } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';

export default function HelpTab({
    eventId,
    eventTitle,
    eventType,
    schedule,
    location,
    sessions,
    eventModules,
}: {
    eventId: string;
    eventTitle: string;
    eventType: EventTypeConvention;
    schedule: EventScheduleDto;
    location: EventLocationDto;
    sessions: EventSessionResponseDto[];
    eventModules: EventModuleResponseDto[];
}) {
    const t = useTranslations('HostOnboarding');
    const progress = useHelpProgress({ eventId, title: eventTitle, schedule, location, sessions });

    const hasVenueConvention = Boolean(getCreateEventCatalogEntry(eventType)?.secondarySessionTitleKey);
    const hasVenue = sessions.some((session) => session.isSecondary && !session.deletedAt);
    const enabledModuleKeys = new Set(eventModules.filter((module_) => module_.isEnabled && module_.isAvailable).map((module_) => module_.moduleKey));
    const hasGiftAccountModule = enabledModuleKeys.has('wishlist');
    const rsvpAvailable = isModuleAvailable(eventModules, 'rsvp');

    const detailsActions: HelpStepAction[] = [
        { key: 'settings', href: routes.events.manage(eventId, { tab: 'settings' }), label: t('steps.details.edit') },
    ];
    if (hasVenueConvention) {
        detailsActions.push({
            key: 'venue',
            href: routes.events.tools.schedule(eventId, { section: 'venue-session' }),
            label: t(hasVenue ? 'steps.details.venueEdit' : 'steps.details.venueAdd'),
        });
    }

    type HelpStepEntry = { key: string; title: string; body?: string; complete: boolean; actions: HelpStepAction[] };

    const steps: HelpStepEntry[] = [
        {
            key: 'details',
            title: t('steps.details.title'),
            complete: progress.details,
            actions: detailsActions,
        },
        rsvpAvailable && {
            key: 'rsvp',
            title: t('steps.rsvp.title'),
            complete: progress.rsvp,
            actions: [{ key: 'rsvp', href: routes.events.tools.rsvp(eventId), label: t('steps.rsvp.edit') }],
        },
        hasGiftAccountModule && {
            key: 'giftAccount',
            title: t('steps.giftAccount.title'),
            complete: progress.giftAccount,
            actions: [{ key: 'gifts', href: routes.events.tools.gifts(eventId), label: t('steps.giftAccount.edit') }],
        },
        {
            key: 'schedule',
            title: t('steps.schedule.title'),
            complete: progress.schedule,
            actions: [{ key: 'schedule', href: routes.events.tools.schedule(eventId), label: t('steps.schedule.edit') }],
        },
        {
            key: 'invitations',
            title: t('steps.invitations.title'),
            body: t('steps.invitations.body'),
            complete: progress.invitations,
            actions: [
                { key: 'qr', href: routes.events.invitationsQr(eventId), label: t('steps.invitations.qr') },
                { key: 'named', href: routes.events.manage(eventId, { tab: 'members' }), label: t('steps.invitations.named') },
            ],
        },
    ].filter((step): step is HelpStepEntry => Boolean(step));

    return (
        <div className="flex flex-col pb-6">
            {/* Welcome */}
            <div className="mb-8 text-center">
                <p className="text-sm font-semibold text-ink">{t('welcome.greeting')}</p>
                <p className="mt-1 text-sm text-ink-muted">{t('welcome.subtitle')}</p>
                <p className="mt-1 text-lg font-bold text-ink">{eventTitle}</p>
            </div>

            {/* Section heading */}
            <div className="mb-5 border-t border-border/70 pt-6 text-center sm:pl-8 sm:text-left">
                <h2 className="text-base font-semibold text-ink">{t('steps.section.title')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('steps.section.body')}</p>
            </div>

            {/* Setup steps */}
            <HelpStepper>
                {steps.map((step, index) => (
                    <HelpStep
                        key={step.key}
                        index={index + 1}
                        title={step.title}
                        body={step.body}
                        complete={step.complete}
                        actions={step.actions}
                        isLast={index === steps.length - 1}
                    />
                ))}
            </HelpStepper>
        </div>
    );
}
