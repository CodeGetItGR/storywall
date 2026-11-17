'use client';

import { useCallback, useState } from 'react';

import { useInvitationEventCheckout } from '@/hooks/useInvitationEventCheckout';
import { useInvitationEventChoice } from '@/hooks/useInvitationEventChoice';
import type { InvitationDocument } from '@/lib/invitation/document';

type InvitationEventStepOptions = {
    draftId: string;
    eventType: string;
    document: InvitationDocument;
    open: boolean;
    onAttached: (eventId: string) => void;
};

// Publishing a draft that is on no event: the host puts it on one of their events, or makes a new
// one from the invitation. With no event to choose, the new one's plan step opens straight away.
export function useInvitationEventStep({ draftId, eventType, document, open, onAttached }: InvitationEventStepOptions) {
    const [isNew, setIsNew] = useState(false);
    const choice = useInvitationEventChoice({ draftId, eventType, enabled: open, onAttached });
    const hasEvents = choice.events.length > 0;
    const showsChoice = !isNew && (choice.isLoading || hasEvents);
    const checkout = useInvitationEventCheckout({ draftId, eventType, document, enabled: open });

    const startNew = useCallback(() => setIsNew(true), []);
    const backToChoice = useCallback(() => setIsNew(false), []);

    return { showsChoice, choice, checkout, startNew, backToChoice: hasEvents ? backToChoice : null };
}

export type InvitationEventStep = ReturnType<typeof useInvitationEventStep>;
