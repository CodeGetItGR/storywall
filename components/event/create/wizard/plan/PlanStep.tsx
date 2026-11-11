'use client';

import { useTranslations } from 'next-intl';

import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { PlanCard } from '@/components/event/create/wizard/plan/PlanCard';
import { PlanGuestChips } from '@/components/event/create/wizard/plan/PlanGuestChips';
import { PlansSheet } from '@/components/event/create/wizard/plan/PlansSheet';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCreateEventPlansSheet } from '@/hooks/useCreateEventPlansSheet';
import { useCreateEventWizardPlanStep } from '@/hooks/useCreateEventWizardPlanStep';

// Step 2: how many guests, the plan that fits, and a way to see every plan.
export function PlanStep() {
    const t = useTranslations('CreateEventPage.wizard.plan');
    const tPage = useTranslations('CreateEventPage');
    const { isLoading, isEmpty, chips, card, onSelectPlan, onChipKeyDown, onDurationChange } = useCreateEventWizardPlanStep();
    const sheet = useCreateEventPlansSheet();

    return (
        <div className="flex flex-col gap-6.5 pt-2">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('heading')}
            </h1>

            {isLoading && <LoadingState label={tPage('loadingPlans')} className="rounded-xl bg-white p-6" />}
            {!isLoading && isEmpty && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{tPage('noPlans')}</p>}

            {!isLoading && !isEmpty && (
                <>
                    {/* Guests */}
                    <PlanGuestChips chips={chips} labelledBy={CREATE_EVENT_WIZARD_HEADING_ID} onSelect={onSelectPlan} onKeyDown={onChipKeyDown} />

                    {/* Plan */}
                    {card && <PlanCard card={card} onDurationChange={onDurationChange} />}

                    {/* Compare */}
                    <button
                        type="button"
                        onClick={sheet.open}
                        className="mx-auto h-11 px-4 text-[15px] font-bold text-ink underline underline-offset-[3px] focus-ring"
                    >
                        {t('compare')}
                    </button>
                    <PlansSheet />
                </>
            )}
        </div>
    );
}
