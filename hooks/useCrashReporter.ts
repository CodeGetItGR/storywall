'use client';

import { useEffect } from 'react';

import { installCrashReporter } from '@/lib/betaFeedback/crashReporter';

// Listens for uncaught errors only while beta feedback is on.
export function useCrashReporter(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) return;
        return installCrashReporter();
    }, [enabled]);
}
