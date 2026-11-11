'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useRef } from 'react';

import { EventCreateSelectionSummary } from '@/components/event/create/EventCreateSelectionSummary';
import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { EventThemeStep } from '@/components/event/create/EventThemeStep';
import { CreateEventWizardBackButton } from '@/components/event/create/wizard/CreateEventWizardBackButton';
import { CreateEventWizardFooter } from '@/components/event/create/wizard/CreateEventWizardFooter';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { CreateEventWizardProgress } from '@/components/event/create/wizard/CreateEventWizardProgress';
import { PlanStep } from '@/components/event/create/wizard/plan/PlanStep';
import { TypeStep } from '@/components/event/create/wizard/type/TypeStep';
import { useScrollTopOnChange } from '@/hooks/useScrollTopOnChange';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// One wizard, two shells: the pop-up (CreateEventDialog) and the page (CreateEventWizardPage).
// `leading` is the shell's own button: close in the pop-up, back on the page. It sits on the type
// step's photo; later steps show the wizard's own Back instead.
export function CreateEventWizard({ leading }: { leading: ReactNode }) {
    const t = useTranslations('CreateEventPage');
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
                {!isType && step !== 'plan' && (
                    <form id={formId} onSubmit={handleSubmit} className="px-5 pb-6">
                        {/* Earlier picks */}
                        <EventCreateSelectionSummary />

                        {/* Heading */}
                        <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="mb-5 text-lg font-bold text-ink">
                            {step === 'details' && t('subtitle')}
                            {step === 'theme' && t('steps.themeSubtitle')}
                            {step === 'overview' && t('steps.overviewSubtitle')}
                        </h1>

                        {step === 'details' && <EventDetailsStep />}
                        {step === 'theme' && <EventThemeStep />}
                        {step === 'overview' && <EventOverviewStep />}
                    </form>
                )}
            </div>

            {/* Footer */}
            <CreateEventWizardFooter />
        </div>
    );
}
