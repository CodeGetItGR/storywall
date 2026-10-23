'use client';

// eslint-disable-next-line no-restricted-imports -- the one place that wraps it
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

import { isDemoPath } from '@/lib/demo/demoRouting';
import { isEventFeedPath } from '@/lib/routes';

// next/link, except where it never prefetches:
// - the demo: its pages read their data from the browser, so a prefetch only spends a server call
//   and bandwidth the demo's images need.
// - an event's feed: the links in view would fetch about ten pages while the banner image, the
//   feed's largest paint, is still loading.
export function AppLink({ prefetch, ...props }: ComponentProps<typeof Link>) {
    const pathname = usePathname();
    const noPrefetch = isDemoPath(pathname) || isEventFeedPath(pathname);
    return <Link {...props} prefetch={noPrefetch ? false : prefetch} />;
}
