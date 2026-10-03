import type { Metadata, Viewport } from 'next';
import { type ReactNode } from 'react';

import { RootDocument } from '@/components/layout/RootDocument';
import { resolveServerSession } from '@/lib/auth/serverEventContext';
import { getRootMetadata, rootViewport } from '@/lib/rootMetadata';
import { AppProviders } from '@/providers/AppProviders';

export const viewport: Viewport = rootViewport;

export function generateMetadata(): Promise<Metadata> {
    return getRootMetadata();
}

// A full page load of a signed-in page hands the browser the session the
// server already holds, so the app doesn't ask for a new token before showing
// the page. Null on public pages and in-app navigations.
export default async function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
    const handoff = await resolveServerSession();

    return (
        <RootDocument>
            <AppProviders handoff={handoff}>{children}</AppProviders>
        </RootDocument>
    );
}
