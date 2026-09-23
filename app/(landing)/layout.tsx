import type { Metadata, Viewport } from 'next';
import { getMessages } from 'next-intl/server';
import { type ReactNode } from 'react';

import { RootDocument } from '@/components/layout/RootDocument';
import { pickPublicMessages } from '@/i18n/publicMessages';
import { getRootMetadata, rootViewport } from '@/lib/rootMetadata';
import { PublicProviders } from '@/providers/PublicProviders';

export const viewport: Viewport = rootViewport;

export function generateMetadata(): Promise<Metadata> {
    return getRootMetadata();
}

// A root layout of its own, separate from app/(main), so Next.js does a full
// page load whenever a visitor leaves the landing page. The trimmed message
// set below can then never follow them into the app.
export default async function LandingLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <RootDocument messages={pickPublicMessages(await getMessages())}>
            <PublicProviders>{children}</PublicProviders>
        </RootDocument>
    );
}
