'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';

import { makeQueryClient } from '@/lib/queryClient';
import { AppConfigBootstrap } from '@/providers/AppConfigBootstrap';
import { AuthProvider } from '@/providers/AuthProvider';
import { ComposerProvider } from '@/providers/ComposerProvider';
import { DocumentTitleSync } from '@/providers/DocumentTitleSync';
import { EventProvider } from '@/providers/EventProvider';
import { MobileChromeProvider } from '@/providers/MobileChromeProvider';
import { ModalProvider } from '@/providers/ModalProvider';

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(makeQueryClient);
    const pathname = usePathname();
    // /demo mounts its own ComposerProvider, scoped to its fake event context (see
    // app/demo/layout.tsx). This root instance sits above it and would otherwise make a
    // real, unmockable fetch (useComposerController -> useAppConfig()) for an event that
    // doesn't exist here — skip it on /demo instead of letting it leak to the real backend.
    const isDemoRoute = pathname?.startsWith('/demo') ?? false;
    const chrome = (
        <MobileChromeProvider>
            <ModalProvider>{children}</ModalProvider>
        </MobileChromeProvider>
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AppConfigBootstrap />
            <AuthProvider>
                <EventProvider>
                    <DocumentTitleSync />
                    {isDemoRoute ? chrome : <ComposerProvider>{chrome}</ComposerProvider>}
                </EventProvider>
            </AuthProvider>
            {/*{process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}*/}
        </QueryClientProvider>
    );
}
