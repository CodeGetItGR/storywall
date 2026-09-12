'use client';

import type { ReactNode } from 'react';

import { useCreateEventFormController } from '@/hooks/useCreateEventFormController';
import { CreateEventFormContext } from '@/providers/createEvent/CreateEventFormContext';

export function CreateEventFormProvider({ children }: { children: ReactNode }) {
    const value = useCreateEventFormController();

    return <CreateEventFormContext.Provider value={value}>{children}</CreateEventFormContext.Provider>;
}

export { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';
