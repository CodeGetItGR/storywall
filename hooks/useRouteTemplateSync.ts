'use client';

import { useParams, usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { setCurrentRouteTemplate, toRouteTemplate } from '@/lib/betaFeedback/routeTemplates';

// Keeps the token-free template of the current page (`/q/:token`) where the
// crash reporter and bug reports can read it.
export function useRouteTemplateSync(): void {
    const pathname = usePathname();
    const params = useParams();

    useEffect(() => {
        setCurrentRouteTemplate(toRouteTemplate(pathname ?? '/', params));
    }, [pathname, params]);
}
