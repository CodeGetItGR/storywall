'use client';

import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BusinessEmptyState } from '@/components/business/BusinessEmptyState';
import { BusinessEventRow } from '@/components/business/BusinessEventRow';
import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { Button } from '@/components/ui/button';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { BusinessEventDto } from '@/lib/api/types';

// The vendor's events, newest first, ten at a time.
export function BusinessEventsSection({
    events,
    isLoading,
    loadFailed,
    hasMore,
    isLoadingMore,
    onLoadMoreAction,
    onRetryAction,
}: {
    events: BusinessEventDto[];
    isLoading: boolean;
    loadFailed: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMoreAction: () => void;
    onRetryAction: () => void;
}) {
    const t = useTranslations('BusinessPage.events');

    return (
        <VendorMeSection id="business-events-title" title={t('title')} icon={<BusinessSectionIcon section="events" />} busy={isLoading}>
            {isLoading ? (
                <VendorRowsSkeleton />
            ) : loadFailed ? (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-ink-muted">{t('loadFailed')}</p>
                    <Button type="button" variant="outline" size="sm" onClick={onRetryAction} className="rounded-full">
                        {t('retry')}
                    </Button>
                </div>
            ) : events.length === 0 ? (
                /* Empty */
                <BusinessEmptyState icon={CalendarDays} title={t('emptyTitle')} body={t('emptyBody')} />
            ) : (
                <>
                    {/* Rows */}
                    <ul className="-my-3 divide-y divide-border">
                        {events.map((event) => (
                            <BusinessEventRow key={event.eventId} event={event} />
                        ))}
                    </ul>

                    {/* More */}
                    {hasMore && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onLoadMoreAction}
                            disabled={isLoadingMore}
                            className="self-center rounded-full"
                        >
                            {t('more')}
                        </Button>
                    )}
                </>
            )}
        </VendorMeSection>
    );
}
