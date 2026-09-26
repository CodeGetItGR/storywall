'use client';

import { SessionUnavailableState } from '@/components/layout/SessionUnavailableState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// What a page shows while it waits on the session instead of a blank screen:
// a spinner, or, while the server can't be reached, why the wait is longer.
export function AuthLoadingState({ className }: { className?: string }) {
    const { isSessionUnavailable } = useAuth();

    if (isSessionUnavailable) {
        return <SessionUnavailableState className={className} />;
    }

    return <LoadingState size="md" className={cn('h-full bg-background', className)} />;
}
