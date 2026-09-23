'use client';

import { LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DeletedEventActions } from '@/components/manage/danger/DeletedEventActions';
import { EventDeletedBanner } from '@/components/manage/danger/EventDeletedBanner';
import type { EventDetailResponseDto } from '@/lib/api/types';

import BillingTab from '../../app/(main)/(app)/(event)/events/[eventId]/manage/BillingTab';

/** The manage page for a deleted event: the deletion notice and the billing
 * record. No sections, no switcher — there is nothing left to manage. */
export function DeletedEventManageScreen({ event }: { event: EventDetailResponseDto }) {
    const t = useTranslations('ManagePage');

    return (
        <div className="mx-auto w-full max-w-6xl pb-28 lg:pb-10">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 lg:px-6 lg:pt-6 lg:pb-5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                    <LayoutDashboard className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {t('title')}
                </p>
                <h1 className="mt-0.5 truncate text-lg leading-tight font-bold text-ink sm:text-xl lg:text-2xl">{event.title}</h1>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-6 px-4 pt-4 lg:max-w-4xl lg:px-6 lg:pt-5">
                {/* Deleted */}
                <EventDeletedBanner event={event} />

                {/* Still available */}
                <DeletedEventActions />

                {/* Billing */}
                <section>
                    <h2 className="mb-4 text-sm font-bold tracking-wide text-ink-muted uppercase">{t('sections.billing')}</h2>
                    <BillingTab eventId={event.id} schedule={event.schedule} isDeleted />
                </section>
            </div>
        </div>
    );
}
