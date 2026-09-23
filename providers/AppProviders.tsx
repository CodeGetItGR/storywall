'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
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

export function AppProviders({ children }: { children: ReactNode }) {
    const isDemoRoute = usePathname()?.startsWith('/demo') ?? false;
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
