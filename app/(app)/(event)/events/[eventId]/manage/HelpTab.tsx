import { useTranslations } from 'next-intl';

import { HelpInfoBlock } from '@/components/manage/help/HelpInfoBlock';
import { HelpLinksBlock } from '@/components/manage/help/HelpLinksBlock';
import type { EventModuleResponseDto, EventSessionResponseDto, EventTypeConvention } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { routes } from '@/lib/routes';

export default function HelpTab({
    eventId,
    eventTitle,
    eventType,
    sessions,
    eventModules,
}: {
    eventId: string;
    eventTitle: string;
    eventType: EventTypeConvention;
    sessions: EventSessionResponseDto[];
    eventModules: EventModuleResponseDto[];
}) {
    const t = useTranslations('HostOnboarding');

    const hasVenueConvention = Boolean(getCreateEventCatalogEntry(eventType)?.secondarySessionTitleKey);
    const hasVenue = sessions.some((session) => session.isSecondary && !session.deletedAt);

    const enabledModuleKeys = new Set(eventModules.filter((module_) => module_.isEnabled && module_.isAvailable).map((module_) => module_.moduleKey));
    const toolCatalog = [
        { moduleKey: null, href: routes.events.tools.schedule(eventId), labelKey: 'schedule' },
        { moduleKey: 'rsvp', href: routes.events.tools.rsvp(eventId), labelKey: 'rsvp' },
        { moduleKey: 'gallery', href: routes.events.tools.gallery(eventId), labelKey: 'gallery' },
        { moduleKey: 'playlist', href: routes.events.tools.playlist(eventId), labelKey: 'playlist' },
        { moduleKey: 'wishbook', href: routes.events.tools.wishbook(eventId), labelKey: 'wishbook' },
        { moduleKey: 'wishlist', href: routes.events.tools.gifts(eventId), labelKey: 'gifts' },
    ] as const;
    const toolItems = toolCatalog
        .filter((entry) => entry.moduleKey === null || enabledModuleKeys.has(entry.moduleKey))
        .map((entry) => ({
            key: entry.labelKey,
            href: entry.href,
            label: t(`tools.items.${entry.labelKey}`),
        }));

    return (
        <div className="flex flex-col gap-8 pb-6">
            {/* Welcome */}
            <HelpInfoBlock title={t('welcome.title', { eventTitle })} body={t('welcome.body')} />

            {/* Dashboard */}
            <HelpLinksBlock
                title={t('dashboard.title')}
                body={t('dashboard.body')}
                items={[
                    {
                        key: 'settings',
                        href: routes.events.manage(eventId, { tab: 'settings' }),
                        label: t('dashboard.items.settings'),
                    },
                    {
                        key: 'schedule',
                        href: routes.events.tools.schedule(eventId),
                        label: t('dashboard.items.schedule'),
                    },
                ]}
            />

            {/* Venue */}
            {hasVenueConvention && (
                <HelpInfoBlock
                    title={t(hasVenue ? 'venue.readyTitle' : 'venue.askTitle')}
                    body={t(hasVenue ? 'venue.readyBody' : 'venue.askBody')}
                    linkHref={routes.events.tools.schedule(eventId, { section: 'venue-session' })}
                    linkLabel={t(hasVenue ? 'venue.edit' : 'venue.add')}
                />
            )}

            {/* Invite */}
            <HelpInfoBlock
                title={t('invite.title')}
                body={t('invite.body')}
                linkHref={routes.events.manage(eventId, { tab: 'invitations', section: 'qr' })}
                linkLabel={t('invite.link')}
            />

            {/* Tools */}
            <HelpLinksBlock title={t('tools.title')} body={t('tools.body')} items={toolItems} />

            {/* Done */}
            <HelpInfoBlock title={t('done.title')} body={t('done.body')} />
        </div>
    );
}
