'use client';

import { useEffect } from 'react';

// The app shell locks the body and scrolls inside its own container. Public
// pages scroll the document instead, so they lift that lock while mounted.
export function useLandingDocumentScroll() {
    useEffect(() => {
        document.body.classList.add('landing-document-scroll');
        return () => document.body.classList.remove('landing-document-scroll');
    }, []);
}
