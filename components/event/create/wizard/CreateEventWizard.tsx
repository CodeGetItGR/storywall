'use client';

import { type ReactNode, useRef } from 'react';

import { AccountStep } from '@/components/event/create/wizard/account/AccountStep';
import { CreateEventWizardBackButton } from '@/components/event/create/wizard/CreateEventWizardBackButton';
import { CreateEventWizardFooter } from '@/components/event/create/wizard/CreateEventWizardFooter';
import { CreateEventWizardProgress } from '@/components/event/create/wizard/CreateEventWizardProgress';
import { DetailsStep } from '@/components/event/create/wizard/details/DetailsStep';
import { PlanStep } from '@/components/event/create/wizard/plan/PlanStep';
import { ReviewStep } from '@/components/event/create/wizard/review/ReviewStep';
import { ThemeStep } from '@/components/event/create/wizard/theme/ThemeStep';
import { TypeStep } from '@/components/event/create/wizard/type/TypeStep';
import { useScrollTopOnChange } from '@/hooks/useScrollTopOnChange';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// One wizard, two shells: the pop-up (CreateEventDialog) and the page (CreateEventWizardPage).
// `leading` is the shell's own button: close in the pop-up, back on the page. It sits on the type
// step's photo; later steps show the wizard's own Back instead.
export function CreateEventWizard({ leading }: { leading: ReactNode }) {
    const { step, formId, handleSubmit } = useCreateEventForm();
    const scrollRef = useRef<HTMLDivElement>(null);
    useScrollTopOnChange(scrollRef, step);
    const isType = step === 'type';

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            {/* Progress (on the photo on the type step, so it scrolls away with it there) */}
            {!isType && (
                <div className="shrink-0 px-4 pt-3 pb-3">
                    <CreateEventWizardProgress leading={<CreateEventWizardBackButton />} />
                </div>
            )}

            {/* Step */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                {isType && <TypeStep progress={<CreateEventWizardProgress leading={leading} tone="onPhoto" />} />}
                {step === 'plan' && (
                    <div className="px-5 pb-6">
                        <PlanStep />
                    </div>
                )}
                {step === 'account' && (
                    <div className="px-5 pb-6">
                        <AccountStep />
                    </div>
                )}
                {!isType && step !== 'plan' && step !== 'account' && (
                    <form id={formId} onSubmit={handleSubmit} className="px-5 pb-6">
                        {step === 'details' && <DetailsStep />}
                        {step === 'theme' && <ThemeStep />}
                        {step === 'overview' && <ReviewStep />}
                    </form>
                )}
            </div>

            {/* Footer */}
            <CreateEventWizardFooter />
        </div>
    );
}
