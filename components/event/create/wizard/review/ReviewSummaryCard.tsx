import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { CreateEventWizardReview } from '@/hooks/useCreateEventWizardReview';

const linkClass = 'min-h-11 shrink-0 px-1 text-sm font-bold text-ink underline underline-offset-3 focus-ring';

export function ReviewSummaryCard({ event, plan }: CreateEventWizardReview) {
    const t = useTranslations('CreateEventPage');
    const eventId = useId();
    const planId = useId();

    return (
        <div className="overflow-hidden rounded-[22px] border border-[#f0e2d2]">
            {/* Event */}
            <div className="flex items-center gap-3.5 p-3.5">
                <span className="relative size-15 shrink-0 overflow-hidden rounded-2xl">
                    <ProtectedImage src={event.photoSrc} alt={event.alt} fill sizes="60px" className="object-cover" />
                </span>
                <div id={eventId} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-editorial text-lg text-ink">{event.title}</span>
                    {event.line && <span className="text-[13px] text-[#6f6257]">{event.line}</span>}
                </div>
                <button type="button" onClick={event.onEdit} aria-describedby={eventId} className={linkClass}>
                    {t('wizard.review.edit')}
                </button>
            </div>

            {/* Plan */}
            {plan && (
                <>
                    <div aria-hidden="true" className="mx-3.5 h-px bg-[#f0e2d2]" />
                    <div className="flex items-center gap-3.5 px-3.5 pt-3 pb-3.5">
                        <div id={planId} className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-[15px] font-bold text-ink">{plan.title}</span>
                            <span className="text-[13px] text-[#6f6257]">{plan.detail}</span>
                        </div>
                        <button type="button" onClick={plan.onChange} aria-describedby={planId} className={linkClass}>
                            {t('selection.change')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
