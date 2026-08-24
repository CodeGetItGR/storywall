import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function QrLandingState({ content, isLoading, terminalState }: { content: ReactNode; isLoading: boolean; terminalState: ReactNode }) {
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
            </div>
        );
    }

    if (terminalState) {
        return terminalState;
    }

    return content;
}
