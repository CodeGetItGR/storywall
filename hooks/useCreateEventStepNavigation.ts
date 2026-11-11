'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { leaveWizardEntry, pushWizardEntry, replaceWizardEntry } from '@/lib/createEventWizardHistory';
import { withWizardParams } from '@/lib/createEventWizardUrl';
import { routes } from '@/lib/routes';
import type { CreateEventStep } from '@/providers/createEvent/CreateEventFormContext';

// 'legacy': today's /events/new, one server render per step. 'wizard': the pop-up or the new page,
// where a step is a search param changed on the client (repo rule for UI state in the URL).
export type CreateEventFlowMode = 'legacy' | 'wizard';

export function useCreateEventStepNavigation(mode: CreateEventFlowMode, run: string | null) {
    const router = useRouter();

    return useMemo(() => {
        if (mode === 'legacy') {
            return {
                push: (step: CreateEventStep) => router.push(routes.events.new({ step, run }), { scroll: false }),
                replace: (step: CreateEventStep) => router.replace(routes.events.new({ step, run })),
                // The old flow has its own Back buttons in the footer; this is never called there.
                back: (previous: CreateEventStep) => router.push(routes.events.new({ step: previous, run }), { scroll: false }),
            };
        }
        const urlFor = (step: CreateEventStep) => withWizardParams(new URL(window.location.href), { step, run });
        return {
            push: (step: CreateEventStep) => pushWizardEntry(urlFor(step), 'step'),
            replace: (step: CreateEventStep) => replaceWizardEntry(urlFor(step)),
            back: (previous: CreateEventStep) => leaveWizardEntry('step', urlFor(previous)),
        };
    }, [mode, router, run]);
}
