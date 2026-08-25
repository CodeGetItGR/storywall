'use client';

import { QueryClientProvider } from '@tanstack/react-query';
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

    return (
        <QueryClientProvider client={queryClient}>
            <AppConfigBootstrap />
            <AuthProvider>
                <EventProvider>
                    <DocumentTitleSync />
                    <ComposerProvider>
                        <MobileChromeProvider>
                            <ModalProvider>{children}</ModalProvider>
                        </MobileChromeProvider>
                    </ComposerProvider>
                </EventProvider>
            </AuthProvider>
            {/*{process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}*/}
        </QueryClientProvider>
    );
}
