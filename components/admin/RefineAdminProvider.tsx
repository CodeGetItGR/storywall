'use client';

import { Refine } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { paidServicesDataProvider } from '@/lib/refine/paidServicesDataProvider';
import { planTiersDataProvider } from '@/lib/refine/planTiersDataProvider';
import { platformEventTypesDataProvider } from '@/lib/refine/platformEventTypesDataProvider';
import { platformModulesDataProvider } from '@/lib/refine/platformModulesDataProvider';

// The admin console has no nested Next.js routes to hand Refine (tabs are
// hash state via AdminNavigationContext), so this runs headless: no
// routerProvider, resources addressed explicitly by name at each hook call.
//
// Each resource gets its own single-resource DataProvider (see lib/refine/*)
// rather than one branching provider — `default` keeps every existing
// paid-services call working unchanged (Refine falls back to it when a hook
// omits `dataProviderName`); the other two resources are addressed by
// passing `dataProviderName` explicitly alongside `resource`.
//
// `<Refine>` creates its own QueryClient unless handed one — reusing the
// app's (via `options.reactQuery.clientConfig`) keeps admin mutations on the
// same cache the rest of the app reads, so `appConfigKeys` invalidation and
// the app's shared retry policy both keep working through Refine's hooks.
export function RefineAdminProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    return (
        <Refine
            dataProvider={{
                default: paidServicesDataProvider,
                'plan-tiers': planTiersDataProvider,
                'platform-modules': platformModulesDataProvider,
                'platform-event-types': platformEventTypesDataProvider,
            }}
            resources={[
                { name: 'paid-services', meta: { label: 'Paid services' } },
                { name: 'plan-tiers', meta: { label: 'Plan tiers' } },
                { name: 'platform-modules', meta: { label: 'Platform modules' } },
                { name: 'platform-event-types', meta: { label: 'Platform event types' } },
            ]}
            options={{
                disableTelemetry: true,
                syncWithLocation: false,
                reactQuery: { clientConfig: queryClient },
            }}
        >
            {children}
        </Refine>
    );
}
