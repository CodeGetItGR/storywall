'use client';

import { usePathname } from 'next/navigation';

import { useAppConfig } from '@/hooks/useAppConfig';

export function AppConfigBootstrap() {
    const pathname = usePathname();
    // /demo loads config into its own query cache while it starts (see lib/demo/demoBootstrap.ts),
    // so the root bootstrap stays off there.
    useAppConfig({ enabled: !pathname?.startsWith('/demo') });
    return null;
}
