'use client';

import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { bootstrapDemo, type DemoBootstrapResult } from '@/lib/demo/demoBootstrap';
import { demoEventTypeKeyFromSlug, isDemoEventTypeSlug } from '@/lib/demo/demoEventTypes';
import { stopDemoMocking } from '@/lib/demo/mockWorker';

export type DemoSessionState = { kind: 'loading' } | DemoBootstrapResult;

export function useDemoSession(eventTypeSlug: string, queryClient: QueryClient): DemoSessionState {
    const isValidSlug = isDemoEventTypeSlug(eventTypeSlug);
    // The app's cache, outside the demo's own provider.
    const appQueryClient = useQueryClient();
    const [state, setState] = useState<DemoSessionState>({ kind: 'loading' });

    useEffect(() => {
        if (!isValidSlug) return;
        const visit = new AbortController();

        void bootstrapDemo(demoEventTypeKeyFromSlug(eventTypeSlug), eventTypeSlug, { app: appQueryClient, demo: queryClient }, visit.signal).then(
            (result) => {
                if (!visit.signal.aborted) setState(result);
            },
        );

        // Stops interception when leaving /demo client-side, so the real app talks to the backend again.
        return () => {
            visit.abort();
            stopDemoMocking();
        };
    }, [appQueryClient, eventTypeSlug, isValidSlug, queryClient]);

    return isValidSlug ? state : { kind: 'not-found' };
}
