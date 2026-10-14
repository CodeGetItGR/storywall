'use client';

// eslint-disable-next-line no-restricted-imports -- the one place that wraps it
import Link from 'next/link';
import type { ComponentProps } from 'react';

import { useIsDemoRoute } from '@/hooks/useIsDemoRoute';

// next/link, except inside the demo, where it never prefetches: demo pages read their data from the
// browser, so a prefetch only spends a server call and bandwidth the demo's images need.
export function AppLink({ prefetch, ...props }: ComponentProps<typeof Link>) {
    const isDemoRoute = useIsDemoRoute();
    return <Link {...props} prefetch={isDemoRoute ? false : prefetch} />;
}
