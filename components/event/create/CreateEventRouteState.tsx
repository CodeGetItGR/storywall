import type { ReactNode } from 'react';

import { AuthLoadingState } from '@/components/layout/AuthLoadingState';

export function CreateEventRouteState({ content, isBlocked }: { content: ReactNode; isBlocked: boolean }) {
    if (!isBlocked) {
        return content;
    }

    return (
        <main className="h-full">
            <AuthLoadingState />
        </main>
    );
}
