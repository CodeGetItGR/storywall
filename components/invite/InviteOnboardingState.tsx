import type { ReactNode } from 'react';

import { InviteSkeleton } from '@/components/invite/InviteSkeleton';

export function InviteOnboardingState({ content, isLoading, terminalState }: { content: ReactNode; isLoading: boolean; terminalState: ReactNode }) {
    if (isLoading) {
        return <InviteSkeleton />;
    }

    if (terminalState) {
        return terminalState;
    }

    return content;
}
