'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { buildReturnPath } from '@/lib/auth/returnPath';

// The current route (with its query string) as a `next` value for
// routes.auth.login / routes.auth.register.
export function useCurrentReturnPath(): string {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    return buildReturnPath(pathname, searchParams.toString());
}
