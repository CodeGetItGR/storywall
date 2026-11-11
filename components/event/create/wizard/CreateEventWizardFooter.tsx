'use client';

import { Loader2, Lock } from 'lucide-react';

import { EventOverviewConsentHint } from '@/components/event/create/EventOverviewConsentHint';
import { EventOverviewError } from '@/components/event/create/EventOverviewError';
import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { useCreateEventWizardFooter } from '@/hooks/useCreateEventWizardFooter';

// One full-width gradient button with an ink label (6.3:1 and up; white fails) on every step.
export function CreateEventWizardFooter() {
    const action = useCreateEventWizardFooter();

    return (
        <footer className="shrink-0 bg-linear-to-b from-white/0 to-white to-30% px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            {/* Review notes */}
            {action.showReviewNotes && (
                <>
                    <EventOverviewError />
                    <EventOverviewConsentHint />
                    <IncidentPausedNote className="mb-2 text-center" />
                </>
            )}

            {/* Button */}
            <button
                type={action.submitsForm ? 'submit' : 'button'}
                form={action.submitsForm}
                disabled={action.disabled}
                onClick={action.onClick}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[15px] font-bold text-ink focus-ring transition-[opacity,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100"
            >
                {action.pending ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                    action.lock && <Lock aria-hidden="true" className="size-4.5" strokeWidth={2.4} />
                )}
                {action.label}
            </button>
        </footer>
    );
}
