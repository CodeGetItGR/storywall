'use client';

import { type AbstractIntlMessages, useMessages } from 'next-intl';
import { useEffect, useState } from 'react';

import { loadCreateWizardMessages } from '@/lib/createEventWizardMessages';

// The wizard's messages on this page. The app already has every namespace ('present'); public pages
// fetch the wizard's on first open and merge them over the page's own. A failed fetch keeps
// 'loading'; the visitor can close the pop-up, and the next open retries.
export function useCreateEventWizardMessages():
    { status: 'present' } | { status: 'loading' } | { status: 'fetched'; messages: AbstractIntlMessages } {
    const messages = useMessages();
    const hasWizardMessages = 'CreateEventPage' in messages;
    const [fetched, setFetched] = useState<AbstractIntlMessages | null>(null);

    useEffect(() => {
        if (hasWizardMessages) return;
        let live = true;
        void loadCreateWizardMessages().then((loaded) => {
            if (live) setFetched(loaded);
        });
        return () => {
            live = false;
        };
    }, [hasWizardMessages]);

    if (hasWizardMessages) return { status: 'present' };
    if (!fetched) return { status: 'loading' };
    return { status: 'fetched', messages: { ...messages, ...fetched } };
}
