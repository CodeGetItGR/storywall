'use client';

import { useLinkClickTracking } from '@/hooks/useLinkClickTracking';

// Counts clicks on links marked with linkClickAttributes(). Renders nothing.
export function LinkClickTracker() {
    useLinkClickTracking();
    return null;
}
