'use client';

import { createContext, type ReactNode, useContext } from 'react';

// showsCreateWizard() reads VERCEL_ENV, which the browser never sees, so the root layouts read it on
// the server and hand it down here, with the create buttons' label (public pages don't ship the
// CreateEventPage messages). Off by default: anything outside the provider keeps the old flow.
type CreateWizardFlag = { enabled: boolean; createLabel: string };

const CreateWizardFlagContext = createContext<CreateWizardFlag>({ enabled: false, createLabel: '' });

export function CreateWizardFlagProvider({ enabled, createLabel, children }: CreateWizardFlag & { children: ReactNode }) {
    return <CreateWizardFlagContext.Provider value={{ enabled, createLabel }}>{children}</CreateWizardFlagContext.Provider>;
}

export function useCreateWizardEnabled(): boolean {
    return useContext(CreateWizardFlagContext).enabled;
}

// "Create an event", for the header and the phone button.
export function useCreateEventButtonLabel(): string {
    return useContext(CreateWizardFlagContext).createLabel;
}
