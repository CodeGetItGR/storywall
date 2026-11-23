'use client';

import { Inbox } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { BusinessEmptyState } from '@/components/business/BusinessEmptyState';
import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { InquiryRow } from '@/components/business/InquiryRow';
import { Button } from '@/components/ui/button';
import { LockedPreview } from '@/components/vendors/me/LockedPreview';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { GuestInquiryDto } from '@/lib/api/types';
import { formatInquiryDate, SAMPLE_INQUIRIES } from '@/lib/inquiries';

const noop = () => {};

// Guests' questions about the partner's dates, newest first. Non-partners see a locked sample; the page's one
// "Become a partner" prompt is in Insights, so this one only says it's for partners.
export function GuestInquiriesSection({
    partner,
    inquiries,
    isLoading,
    loadFailed,
    hasMore,
    isLoadingMore,
    onOpenAction,
    onLoadMoreAction,
    onRetryAction,
}: {
    partner: boolean;
    inquiries: GuestInquiryDto[];
    isLoading: boolean;
    loadFailed: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    onOpenAction: (id: string) => void;
    onLoadMoreAction: () => void;
    onRetryAction: () => void;
}) {
    const t = useTranslations('BusinessPage.inquiries');
    const tEvents = useTranslations('BusinessPage.events');
    const tPartner = useTranslations('Vendors.partner.benefits.inquiries');
    const locale = useLocale();

    return (
        <VendorMeSection
            id="business-inquiries-title"
            title={t('title')}
            icon={<BusinessSectionIcon section="inquiries" />}
            busy={partner && isLoading}
        >
            {!partner ? (
                /* Locked */
                <LockedPreview label={tPartner('title')} canApply={false} onApplyAction={noop}>
                    <ul className="divide-y divide-border">
                        {SAMPLE_INQUIRIES.map((sample) => (
                            <li key={sample.guestName} className="flex min-h-14 flex-col justify-center py-3">
                                <p className="text-sm font-semibold text-ink">{sample.guestName}</p>
                                <p className="text-xs leading-snug text-ink-muted">{formatInquiryDate(locale, sample.eventDate)}</p>
                            </li>
                        ))}
                    </ul>
                </LockedPreview>
            ) : isLoading ? (
                <VendorRowsSkeleton />
            ) : loadFailed ? (
                /* Failed */
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-ink-muted">{t('loadFailed')}</p>
                    <Button type="button" variant="outline" size="sm" onClick={onRetryAction} className="rounded-full">
                        {tEvents('retry')}
                    </Button>
                </div>
            ) : inquiries.length === 0 ? (
                /* Empty */
                <BusinessEmptyState icon={Inbox} title={t('emptyTitle')} body={t('emptyBody')} />
            ) : (
                <>
                    {/* Rows */}
                    <ul className="-my-3 divide-y divide-border">
                        {inquiries.map((inquiry) => (
                            <InquiryRow key={inquiry.id} inquiry={inquiry} onOpenAction={onOpenAction} />
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
                            {tEvents('more')}
                        </Button>
                    )}
                </>
            )}
        </VendorMeSection>
    );
}
