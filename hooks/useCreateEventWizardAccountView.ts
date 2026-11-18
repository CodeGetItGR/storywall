'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { type AccountView, parseAccountView } from '@/lib/createEventWizardAccount';
import { leaveWizardEntry, pushWizardEntry, replaceWizardEntry } from '@/lib/createEventWizardHistory';
import { CREATE_EVENT_ACCOUNT_PARAM, withWizardParams } from '@/lib/createEventWizardUrl';

const urlFor = (view: AccountView) =>
    withWizardParams(new URL(window.location.href), { [CREATE_EVENT_ACCOUNT_PARAM]: view === 'choose' ? null : view });

// Which account screen shows. Each screen is a Back step, like the plans sheet.
export function useCreateEventWizardAccountView() {
    const searchParams = useSearchParams();
    const view = parseAccountView(searchParams.get(CREATE_EVENT_ACCOUNT_PARAM));

    return useMemo(
        () => ({
            view,
            open: (next: AccountView) => pushWizardEntry(urlFor(next), 'account'),
            // Same entry: the code screen after a sign-in replaces the sign-in screen.
            show: (next: AccountView) => replaceWizardEntry(urlFor(next)),
            back: () => leaveWizardEntry('account', urlFor('choose')),
        }),
        [view],
    );
}
