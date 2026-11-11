'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useCampaignPriceClock } from '@/hooks/useCampaignPriceClock';
import type { EventTypeConvention } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { dueAtActivation } from '@/lib/createEventWizardReview';
import { INCIDENT_MODE } from '@/lib/incident';
import { getOptionPriceDetails } from '@/lib/planTiers';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// Copy rows 17-21: the type step's button names the type; any other type gets "your event".
const TYPE_CONTINUE_KEY: Partial<Record<EventTypeConvention, string>> = {
    WEDDING: 'wedding',
    BAPTISM: 'baptism',
    GENDER_REVEAL: 'reveal',
    REUNION: 'reunion',
};

export type WizardFooterAction = {
    label: string;
    disabled: boolean;
    pending: boolean;
    lock: boolean;
    // The review's error, consent hint and incident note go above the button.
    showReviewNotes: boolean;
} & ({ submitsForm: string; onClick?: never } | { submitsForm?: never; onClick: () => void });

// The wizard's one full-width button, on every step.
export function useCreateEventWizardFooter(): WizardFooterAction {
    const t = useTranslations('CreateEventPage.wizard');
    const locale = useLocale();
    const form = useCreateEventForm();
    // The pay label is worked out as it renders; this redraws it when a campaign starts or ends.
    useCampaignPriceClock(form.eventPlans);

    const base = { pending: false, lock: false, showReviewNotes: false };

    if (form.step === 'type') {
        const key = TYPE_CONTINUE_KEY[form.selectedEventType] ?? 'other';
        return { ...base, label: t(`type.continue.${key}`), disabled: !form.canContinueType, onClick: form.goToPlan };
    }
    if (form.step === 'plan') {
        return { ...base, label: t('plan.continue'), disabled: !form.canContinuePlan, onClick: form.goToDetails };
    }
    if (form.step === 'details') {
        return { ...base, label: t('plan.continue'), disabled: !form.canSubmitDetails, submitsForm: form.formId };
    }
    if (form.step === 'theme') {
        return { ...base, label: t('plan.continue'), disabled: false, onClick: form.goToOverview };
    }

    const activation = form.selectedPlan && form.selectedOption ? getOptionPriceDetails(form.selectedPlan, form.selectedOption) : null;
    const due = dueAtActivation(activation, form.checkoutCodePreview, form.selectedPlan?.priceCurrency ?? null);
    return {
        label: t('review.pay', { amount: formatMoney(locale, due.amountMinor, due.currency) }),
        disabled: INCIDENT_MODE || form.isSubmitPending || !form.isEmailVerified || !form.consentSatisfied,
        pending: form.isSubmitPending,
        lock: true,
        showReviewNotes: true,
        submitsForm: form.formId,
    };
}
