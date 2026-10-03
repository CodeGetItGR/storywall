'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { BetaFeedback } from '@/components/betaFeedback/BetaFeedback';
import { GuidelinesAcceptanceGate, GuidelinesGateSignOutHold } from '@/components/legal/GuidelinesAcceptanceGate';
import { useAuth } from '@/hooks/useAuth';
import { meQueryKey } from '@/hooks/useMe';
import { useVisualViewportSync } from '@/hooks/useVisualViewportSync';
import type { SessionHandoff } from '@/lib/auth/sessionHandoff';
import { refreshEventOn4015 } from '@/lib/eventSuspension';
import { reopenGuidelinesGateOn4013 } from '@/lib/guidelinesAcceptance';
import { makeQueryClient } from '@/lib/queryClient';
import { AppConfigBootstrap } from '@/providers/AppConfigBootstrap';
import { AuthProvider } from '@/providers/AuthProvider';
import { ComposerProvider } from '@/providers/ComposerProvider';
import { DocumentTitleSync } from '@/providers/DocumentTitleSync';
import { EventProvider } from '@/providers/EventProvider';
import { MobileChromeProvider } from '@/providers/MobileChromeProvider';
import { ModalProvider } from '@/providers/ModalProvider';

// The composer and its publish queue belong to one account. Any transition from
// a signed-in user to none, explicit or expiry (a failed refresh clears the
// session), or to another account, starts them fresh: the next screen is /login,
// and a surviving draft would be visible to whoever holds the device. Signing
// in (null to a user, which is also how bootstrap resolves) and token refreshes
// keep the same generation, so the page isn't remounted on every load.
function AccountComposerProvider({ children }: { children: ReactNode }) {
    const userId = useAuth().user?.userId ?? null;
    const [lastUserId, setLastUserId] = useState(userId);
    const [generation, setGeneration] = useState(0);
    if (userId !== lastUserId) {
        if (lastUserId !== null) setGeneration((current) => current + 1);
        setLastUserId(userId);
    }
    return <ComposerProvider key={generation}>{children}</ComposerProvider>;
}

// handoff: the session the server already holds on a full page load of a
// signed-in page (see app/(main)/layout.tsx); null everywhere else.
export function AppProviders({ children, handoff = null }: { children: ReactNode; handoff?: SessionHandoff | null }) {
    const isDemoRoute = usePathname()?.startsWith('/demo') ?? false;
    useVisualViewportSync();
    const [queryClient] = useState(() => {
        const client = makeQueryClient();
        // The /api/me answer the session was built from, so useMe doesn't fetch it again.
        if (handoff) client.setQueryData(meQueryKey, handoff.profile);
        return client;
    });
    // Browser only (an effect): the API client is shared with server code.
    useEffect(() => reopenGuidelinesGateOn4013(queryClient), [queryClient]);
    useEffect(() => refreshEventOn4015(queryClient), [queryClient]);
    const chrome = (
        <MobileChromeProvider>
            <ModalProvider>
                {/* Every signed-in page. Inside ComposerProvider so the in-memory publish
                    queue survives the gate opening and closing (failed jobs keep their
                    files for retry); ComposerProvider hides its own modals meanwhile.
                    Bug reports stay outside: they're exempt from 4013. */}
                <GuidelinesAcceptanceGate>{children}</GuidelinesAcceptanceGate>
            </ModalProvider>
        </MobileChromeProvider>
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AppConfigBootstrap />
            <AuthProvider handoff={handoff}>
                <EventProvider>
                    <DocumentTitleSync />
                    <BetaFeedback />
                    <GuidelinesGateSignOutHold>
                        {isDemoRoute ? chrome : <AccountComposerProvider>{chrome}</AccountComposerProvider>}
                    </GuidelinesGateSignOutHold>
                </EventProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
