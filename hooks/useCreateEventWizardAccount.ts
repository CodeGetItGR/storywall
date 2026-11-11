'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useCreateEventWizardAccountView } from '@/hooks/useCreateEventWizardAccountView';
import { localeCookieChanged } from '@/hooks/useNavigateAfterSignIn';
import { accountDestination } from '@/lib/createEventWizardAccount';
import { routes } from '@/lib/routes';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The account step's "what next": once someone is signed in, review for a verified account, the code
// for an unverified one, the console for an admin. A sign-in that restored another language reloads
// the page (the draft brings the host back here).
export function useCreateEventWizardAccount() {
    const router = useRouter();
    const { user, isBootstrapping } = useAuth();
    const { step, goToStep } = useCreateEventForm();
    const accountView = useCreateEventWizardAccountView();
    const destination = isBootstrapping ? null : accountDestination(user ? { emailVerified: user.emailVerified, role: user.role } : null);
    const { view, show } = accountView;

    useEffect(() => {
        if (step !== 'account' || !destination) return;
        if (destination === 'admin') router.replace(routes.admin);
        else if (destination === 'review') goToStep('overview');
        else if (view !== 'code' && view !== 'email') show('code');
    }, [destination, goToStep, router, show, step, view]);

    // Passed to the forms: after a sign-in, only the language needs handling here.
    const onSignedIn = useCallback(() => {
        if (localeCookieChanged()) window.location.reload();
    }, []);

    return { ...accountView, onSignedIn };
}
