'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { BetaFeedback } from '@/components/betaFeedback/BetaFeedback';
import { GuidelinesAcceptanceGate, GuidelinesGateSignOutHold } from '@/components/legal/GuidelinesAcceptanceGate';
import { useAuth } from '@/hooks/useAuth';
import { useVisualViewportSync } from '@/hooks/useVisualViewportSync';
import { reopenGuidelinesGateOn4013 } from '@/lib/guidelinesAcceptance';
import { makeQueryClient } from '@/lib/queryClient';
import { AppConfigBootstrap } from '@/providers/AppConfigBootstrap';
import { AuthProvider } from '@/providers/AuthProvider';
import { ComposerProvider } from '@/providers/ComposerProvider';
import { DocumentTitleSync } from '@/providers/DocumentTitleSync';
import { EventProvider } from '@/providers/EventProvider';
import { MobileChromeProvider } from '@/providers/MobileChromeProvider';
import { ModalProvider } from '@/providers/ModalProvider';

// The composer and its publish queue belong to one account. Signing out, or
// switching account, starts them fresh so the next person on the device never
// sees the last one's draft. Signing in (null to a user, which is also how
// bootstrap resolves) and token refreshes keep the same generation, so the
// page isn't remounted on every load.
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

export function AppProviders({ children }: { children: ReactNode }) {
    const isDemoRoute = usePathname()?.startsWith('/demo') ?? false;
    useVisualViewportSync();
    const [queryClient] = useState(makeQueryClient);
    // Browser only (an effect): the API client is shared with server code.
    useEffect(() => reopenGuidelinesGateOn4013(queryClient), [queryClient]);
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
            <AuthProvider>
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
