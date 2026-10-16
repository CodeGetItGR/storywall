'use client';

import { useLandingDocumentScroll } from '@/hooks/useLandingDocumentScroll';

// For server-rendered public pages that don't use LandingPageShell.
export function LandingDocumentScroll() {
    useLandingDocumentScroll();
    return null;
}
