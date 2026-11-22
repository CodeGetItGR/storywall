'use client';

import { createContext, type ReactNode, useContext } from 'react';

// showsFeedEditor() reads VERCEL_ENV, which the browser never sees, so the pages read it on the
// server and hand it down here. Off by default: anything outside the provider keeps today's feed.
const FeedEditorFlagContext = createContext(false);

export function FeedEditorFlagProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
    return <FeedEditorFlagContext.Provider value={enabled}>{children}</FeedEditorFlagContext.Provider>;
}

export function useFeedEditorEnabled(): boolean {
    return useContext(FeedEditorFlagContext);
}
