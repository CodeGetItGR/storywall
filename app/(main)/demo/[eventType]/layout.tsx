'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, use, useState } from 'react';

import { DemoShell } from '@/components/demo/DemoShell';
import { DemoUnavailable } from '@/components/demo/DemoUnavailable';
import { useDemoSession } from '@/hooks/useDemoSession';
import { makeQueryClient } from '@/lib/queryClient';

// A client layout on purpose: the demo snapshot must be fetched from the visitor's browser
// (it is rate-limited per IP), never from a server component, route handler or middleware.
export default function DemoEventTypeLayout({ children, params }: { children: ReactNode; params: Promise<{ eventType: string }> }) {
    const { eventType } = use(params);
    // Its own cache, so demo data never mixes with a signed-in visitor's real event cache.
    const [queryClient] = useState(makeQueryClient);
    const state = useDemoSession(eventType, queryClient);

    if (state.kind === 'loading') return null;
    if (state.kind !== 'ready') return <DemoUnavailable reason={state.kind} />;

    return (
        <QueryClientProvider client={queryClient}>
            <DemoShell session={state.session} etag={state.etag} presignedUrlsValidUntil={state.presignedUrlsValidUntil}>
                {children}
            </DemoShell>
        </QueryClientProvider>
    );
}
