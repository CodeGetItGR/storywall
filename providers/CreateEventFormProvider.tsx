'use client';

import type { ReactNode } from 'react';

import { useCreateEventFormController } from '@/hooks/useCreateEventFormController';
import type { CreateEventFlowMode } from '@/hooks/useCreateEventStepNavigation';
import { CreateEventFormContext } from '@/providers/createEvent/CreateEventFormContext';

export function CreateEventFormProvider({ children, mode = 'legacy' }: { children: ReactNode; mode?: CreateEventFlowMode }) {
    const value = useCreateEventFormController({ mode });

    return <CreateEventFormContext.Provider value={value}>{children}</CreateEventFormContext.Provider>;
}

export { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';
