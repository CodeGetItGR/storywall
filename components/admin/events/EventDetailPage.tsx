'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { EventActivityTab } from '@/components/admin/events/activity/EventActivityTab';
import { EventDetailTabs } from '@/components/admin/events/activity/EventDetailTabs';
import { EventDetail } from '@/components/admin/events/EventDetail';
import { BackButton } from '@/components/ui/BackButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminEvent } from '@/hooks/useAdminEvents';
import { useEventDetailTab } from '@/hooks/useEventDetailTab';
import { EVENTS_HASH_ROOT } from '@/lib/adminEvents';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function EventDetailPage({ eventId, onBackAction }: { eventId: string; onBackAction: (event: MouseEvent<HTMLAnchorElement>) => void }) {
    const t = useTranslations('AdminPage');
    const eventQuery = useAdminEvent(eventId);
    const tab = useEventDetailTab();

    return (
        <div className="space-y-5">
            {/* Back */}
            <BackButton href={EVENTS_HASH_ROOT} label={t('events.title')} onClick={onBackAction} />

            {/* Content */}
            {eventQuery.isLoading && <LoadingState label={t('events.loading')} className="justify-start py-6" />}
            {Boolean(eventQuery.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(eventQuery.error)}`)}</p>}
            {eventQuery.data && (
                <>
                    {/* Tabs */}
                    <EventDetailTabs eventId={eventId} tab={tab} />
                    {tab === 'activity' ? <EventActivityTab key={eventId} eventId={eventId} /> : <EventDetail event={eventQuery.data} />}
                </>
            )}
        </div>
    );
}
