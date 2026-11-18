'use client';

import { useTranslations } from 'next-intl';

import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { ReviewSummaryCard } from '@/components/event/create/wizard/review/ReviewSummaryCard';
import { useCreateEventWizardReview } from '@/hooks/useCreateEventWizardReview';

export function ReviewStep() {
    const t = useTranslations('CreateEventPage.wizard.review');
    const review = useCreateEventWizardReview();

    return (
        <div className="flex flex-col gap-4.5">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('heading')}
            </h1>

            {/* Summary */}
            <ReviewSummaryCard {...review} />

            {/* Prices, code, notices and withdrawal, as today */}
            <EventOverviewStep showEventSummary={false} />
        </div>
    );
}
