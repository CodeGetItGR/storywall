'use client';

import { Lightbulb, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import type { OutreachProgressFormState } from '@/hooks/useOutreachProgressForm';
import { OUTREACH_SENDER_PLACEHOLDER, outreachTip, todayInAthens } from '@/lib/adminOutreach';
import type { OutreachProspectDto } from '@/lib/api/types';

// What to do now for this status, and the one button that does the next step.
export function OutreachTipCard({ prospect, form }: { prospect: OutreachProspectDto; form: OutreachProgressFormState }) {
    const t = useTranslations('AdminPage.outreach');
    const format = useOutreachFormat();
    const tip = outreachTip(prospect.status, prospect.nextFollowupOn, todayInAthens());

    return (
        <section aria-label={t('tips.label')} className="rounded-lg bg-canvas p-4">
            {/* Tip */}
            <div className="flex gap-3">
                <Lightbulb aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" />
                <p className="text-sm leading-6 text-ink">
                    {t(`tips.${tip}`, { placeholder: OUTREACH_SENDER_PLACEHOLDER, date: format.day(prospect.nextFollowupOn) })}
                </p>
            </div>

            {/* Next step */}
            {form.nextStatus && (
                <div className="mt-3 pl-7">
                    <button
                        type="button"
                        onClick={form.handleNextStep}
                        disabled={form.isSaving}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        {form.isSaving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                        {t(`nextStep.${form.nextStatus}`)}
                    </button>
                </div>
            )}
        </section>
    );
}
