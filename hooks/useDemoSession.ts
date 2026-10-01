'use client';

import { type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { bootstrapDemo, type DemoBootstrapResult } from '@/lib/demo/demoBootstrap';
import { demoEventTypeKeyFromSlug, isDemoEventTypeSlug } from '@/lib/demo/demoEventTypes';
import { stopDemoMocking } from '@/lib/demo/mockWorker';

export type DemoSessionState = { kind: 'loading' } | DemoBootstrapResult;

export function useDemoSession(eventTypeSlug: string, queryClient: QueryClient): DemoSessionState {
    const isValidSlug = isDemoEventTypeSlug(eventTypeSlug);
    const [state, setState] = useState<DemoSessionState>({ kind: 'loading' });

    useEffect(() => {
        if (!isValidSlug) return;
        let cancelled = false;

        void bootstrapDemo(demoEventTypeKeyFromSlug(eventTypeSlug), eventTypeSlug, queryClient).then((result) => {
            if (!cancelled) setState(result);
        });

        // Stops interception when leaving /demo client-side, so the real app talks to the backend again.
        return () => {
            cancelled = true;
            stopDemoMocking();
        };
    }, [eventTypeSlug, isValidSlug, queryClient]);

    return isValidSlug ? state : { kind: 'not-found' };
}
