'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { CampaignAttributionTracker } from '@/components/layout/CampaignAttributionTracker';
import { CampaignVisitTracker } from '@/components/layout/CampaignVisitTracker';
import { PartnerCodeLinkTracker } from '@/components/layout/PartnerCodeLinkTracker';
import { SignupSourceTracker } from '@/components/layout/SignupSourceTracker';
import { makeQueryClient } from '@/lib/queryClient';
import { AppConfigBootstrap } from '@/providers/AppConfigBootstrap';
import { AuthProvider } from '@/providers/AuthProvider';

export function PublicProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(makeQueryClient);

    return (
        <QueryClientProvider client={queryClient}>
            <AppConfigBootstrap />
            <SignupSourceTracker />
            <CampaignAttributionTracker />
            <PartnerCodeLinkTracker />
            <CampaignVisitTracker />
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );
}
