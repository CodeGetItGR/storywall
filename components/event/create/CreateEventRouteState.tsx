import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function CreateEventRouteState({ content, isBlocked }: { content: ReactNode; isBlocked: boolean }) {
    if (!isBlocked) {
        return content;
    }

    return (
        <main className="flex h-full items-center justify-center bg-background">
            <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
        </main>
    );
}
