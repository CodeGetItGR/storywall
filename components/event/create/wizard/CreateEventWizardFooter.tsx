'use client';

import { useTranslations } from 'next-intl';

import { EventOverviewConsentHint } from '@/components/event/create/EventOverviewConsentHint';
import { EventOverviewError } from '@/components/event/create/EventOverviewError';
import { CreateEventWizardButton } from '@/components/event/create/wizard/CreateEventWizardButton';
import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { useCreateEventWizardFooter } from '@/hooks/useCreateEventWizardFooter';

// One full-width gradient button with an ink label (6.3:1 and up; white fails) on every step.
export function CreateEventWizardFooter() {
    const t = useTranslations('CreateEventPage.wizard.review');
    const action = useCreateEventWizardFooter();
    if (!action) return null;

    return (
        <footer className="shrink-0 bg-linear-to-b from-white/0 to-white to-30% px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            {/* Review notes */}
            {action.showReviewNotes && (
                <>
                    <EventOverviewError />
                    <EventOverviewConsentHint highlight label={t('consentHint')} />
                    <IncidentPausedNote className="mb-2 text-center" />
                </>
            )}

            {/* Button */}
            <CreateEventWizardButton
                type={action.submitsForm ? 'submit' : 'button'}
                form={action.submitsForm}
                disabled={action.disabled}
                onClick={action.onClick}
                label={action.label}
                pending={action.pending}
                lock={action.lock}
            />
        </footer>
    );
}
