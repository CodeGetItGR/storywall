'use client';

import { useHideComposerFab } from '@/hooks/useHideComposerFab';

// Renders nothing; hides the compose button for as long as it is mounted.
export function HideComposerFab() {
    useHideComposerFab('feed-loading');
    return null;
}
