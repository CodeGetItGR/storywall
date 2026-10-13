'use client';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useIsDemoRoute } from '@/hooks/useIsDemoRoute';

export function AppConfigBootstrap() {
    const isDemoRoute = useIsDemoRoute();
    // /demo loads config into its own query cache while it starts (see lib/demo/demoBootstrap.ts),
    // so the root bootstrap stays off there.
    useAppConfig({ enabled: !isDemoRoute });
    return null;
}
