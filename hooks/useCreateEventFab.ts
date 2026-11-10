'use client';

import { useSearchParams } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useCreateEventFabVisible } from '@/hooks/useCreateEventFabVisible';
import { useLandingSalePercent } from '@/hooks/useLandingSaleButton';
import { isWizardOpen } from '@/lib/createEventWizardUrl';
import { useCreateEventButtonLabel, useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

// The phone create button's state. Off with the flag off, for admins (the wizard sends them to their
// console), while the wizard is open, and until the cookie question (which sits in the same spot at
// the bottom) is answered. salePercent: set during a discount campaign, when the button
// takes the sale look in place of the sale button.
export function useCreateEventFab() {
    const enabled = useCreateWizardEnabled();
    const label = useCreateEventButtonLabel();
    const { user } = useAuth();
    const wizardOpen = isWizardOpen(useSearchParams());
    const { consent } = useCookieConsent();
    const cookieAnswered = consent !== null && consent !== undefined;
    const { visible, href } = useCreateEventFabVisible(enabled && Boolean(label) && user?.role !== 'ADMIN' && !wizardOpen && cookieAnswered);
    const salePercent = useLandingSalePercent();

    return { visible, href, label, salePercent };
}
