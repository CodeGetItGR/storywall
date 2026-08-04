'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { ApiError } from '@/lib/api/client';
import { AuthProvider } from '@/providers/AuthProvider';
import { ComposerProvider } from '@/providers/ComposerProvider';
import { EventProvider } from '@/providers/EventProvider';
import { ModalProvider } from '@/providers/ModalProvider';

const ReactQueryDevtools = dynamic(() => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools), {
    ssr: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: (failureCount, error) => {
                            // 4xx responses (bad auth, validation, not-found, etc.) won't
                            // succeed on retry — only retry transient/server errors.
                            if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
                            return failureCount < 2;
                        },
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <EventProvider>
                    <ComposerProvider>
                        <ModalProvider>{children}</ModalProvider>
                    </ComposerProvider>
                </EventProvider>
            </AuthProvider>
            {/*{process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}*/}
        </QueryClientProvider>
    );
}
