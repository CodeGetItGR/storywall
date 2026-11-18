'use client';

import { useAuth } from '@/hooks/useAuth';
import { useCreateEventWizardAccountView } from '@/hooks/useCreateEventWizardAccountView';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The wizard's Back: on a sign-up or sign-in screen of a signed-out start it returns to the account
// choices; anywhere else it goes to the step before.
export function useCreateEventWizardBack() {
    const { goBack, step } = useCreateEventForm();
    const { isAuthenticated } = useAuth();
    const accountView = useCreateEventWizardAccountView();
    const backToChoose = step === 'account' && !isAuthenticated && (accountView.view === 'signup' || accountView.view === 'signin');
    return backToChoose ? accountView.back : goBack;
}
