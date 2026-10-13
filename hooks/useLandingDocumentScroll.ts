'use client';

import { useEffect } from 'react';

// The root layout locks <body> to the viewport for the app shell; public
// marketing pages scroll the document instead.
export function useLandingDocumentScroll() {
    useEffect(() => {
        document.body.classList.add('landing-document-scroll');
        return () => document.body.classList.remove('landing-document-scroll');
    }, []);
}
