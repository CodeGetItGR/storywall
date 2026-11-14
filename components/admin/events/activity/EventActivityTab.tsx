'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { EventActivityContent } from '@/components/admin/events/activity/EventActivityContent';
import { EventActivitySkeleton } from '@/components/admin/events/activity/EventActivitySkeleton';
import { EventActivityToolbar } from '@/components/admin/events/activity/EventActivityToolbar';
import { useAdminEventActivity } from '@/hooks/useAdminEvents';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// The Activity tab: loads the counts and hands them to the content.
export function EventActivityTab({ eventId }: { eventId: string }) {
    const t = useTranslations('AdminPage');
    const query = useAdminEventActivity(eventId);
    const { refetch } = query;
    const refresh = useCallback(() => void refetch(), [refetch]);

    return (
        <div className="max-w-6xl space-y-5">
            {/* Toolbar */}
            {(query.data || query.error) && (
                <EventActivityToolbar
                    updatedAt={query.dataUpdatedAt > 0 ? query.dataUpdatedAt : null}
                    refreshing={query.isFetching}
                    onRefreshAction={refresh}
                />
            )}
            {/* Content */}
            {query.isLoading && <EventActivitySkeleton />}
            {Boolean(query.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
            {query.data && <EventActivityContent activity={query.data} />}
        </div>
    );
}
