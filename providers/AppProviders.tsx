'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { useVisualViewportSync } from '@/hooks/useVisualViewportSync';
import { makeQueryClient } from '@/lib/queryClient';
import { AppConfigBootstrap } from '@/providers/AppConfigBootstrap';
import { AuthProvider } from '@/providers/AuthProvider';
import { ComposerProvider } from '@/providers/ComposerProvider';
import { DocumentTitleSync } from '@/providers/DocumentTitleSync';
import { EventProvider } from '@/providers/EventProvider';
import { MobileChromeProvider } from '@/providers/MobileChromeProvider';
import { ModalProvider } from '@/providers/ModalProvider';

type AppProvidersProps = {
    children: ReactNode;
    isDemoRoute: boolean;
};

export function AppProviders({ children, isDemoRoute }: AppProvidersProps) {
    useVisualViewportSync();
    const [queryClient] = useState(makeQueryClient);
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
        </QueryClientProvider>
    );
}
