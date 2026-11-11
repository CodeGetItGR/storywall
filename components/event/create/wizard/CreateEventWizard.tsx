'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useRef } from 'react';

import { EventCreateFooter } from '@/components/event/create/EventCreateFooter';
import { EventCreateSelectionSummary } from '@/components/event/create/EventCreateSelectionSummary';
import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { EventThemeStep } from '@/components/event/create/EventThemeStep';
import { EventTypeStep } from '@/components/event/create/EventTypeStep';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { CreateEventWizardProgress } from '@/components/event/create/wizard/CreateEventWizardProgress';
import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import { useScrollTopOnChange } from '@/hooks/useScrollTopOnChange';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// One wizard, two shells: the pop-up (CreateEventDialog) and the page (CreateEventWizardPage).
// `leading` is the shell's own button: close in the pop-up, back on the page.
export function CreateEventWizard({ leading }: { leading: ReactNode }) {
    const t = useTranslations('CreateEventPage');
    const {
        step,
        formId,
        handleSubmit,
        eventPlans,
        modules,
        media,
        selectedCode,
        durationPicks,
        onSelectPlan,
        onSelectPlanDuration,
        isPlansLoading,
    } = useCreateEventForm();
    const scrollRef = useRef<HTMLDivElement>(null);
    useScrollTopOnChange(scrollRef, step);

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            {/* Progress */}
            <div className="shrink-0 px-5 pt-4 pb-3">
                <CreateEventWizardProgress leading={leading} />
            </div>

            {/* Step */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
                <form id={formId} onSubmit={handleSubmit}>
                    {/* Earlier picks */}
                    <EventCreateSelectionSummary />

                    {/* Heading */}
                    <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="mb-5 text-lg font-bold text-ink">
                        {step === 'type' && t('steps.typeSubtitle')}
                        {step === 'plan' && t('steps.planSubtitle')}
                        {step === 'details' && t('subtitle')}
                        {step === 'theme' && t('steps.themeSubtitle')}
                        {step === 'overview' && t('steps.overviewSubtitle')}
                    </h1>

                    {step === 'type' && <EventTypeStep />}
                    {step === 'plan' && (
                        <EventPlanSelector
                            plans={eventPlans}
                            modules={modules}
                            media={media}
                            selectedCode={selectedCode}
                            durationPicks={durationPicks}
                            onSelectAction={onSelectPlan}
                            onSelectDurationAction={onSelectPlanDuration}
                            isLoading={isPlansLoading}
                        />
                    )}
                    {step === 'details' && <EventDetailsStep />}
                    {step === 'theme' && <EventThemeStep />}
                    {step === 'overview' && <EventOverviewStep />}
                </form>
            </div>

            {/* Footer */}
            <EventCreateFooter />
        </div>
    );
}
