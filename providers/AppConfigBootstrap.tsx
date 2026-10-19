'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { APP_CONFIG_GC_TIME, APP_CONFIG_STALE_TIME, appConfigKeys, fetchAppConfig } from '@/hooks/useAppConfig';
import { useIsDemoRoute } from '@/hooks/useIsDemoRoute';

// Warms the config cache after mount. Subscribing during render would create the query before a
// page's HydrationBoundary, which then hydrates it only in an effect: never on the server.
export function AppConfigBootstrap() {
    const queryClient = useQueryClient();
    const isDemoRoute = useIsDemoRoute();

    useEffect(() => {
        // /demo fetches config itself while it starts (lib/demo/demoBootstrap.ts).
        if (isDemoRoute) return;
        void queryClient.prefetchQuery({
            queryKey: appConfigKeys.all,
            queryFn: fetchAppConfig,
            staleTime: APP_CONFIG_STALE_TIME,
            gcTime: APP_CONFIG_GC_TIME,
        });
    }, [isDemoRoute, queryClient]);

    return null;
}
