import type { Metadata, Viewport } from 'next';
import { type ReactNode } from 'react';

import { RootDocument } from '@/components/layout/RootDocument';
import { getRootMetadata, rootViewport } from '@/lib/rootMetadata';
import { AppProviders } from '@/providers/AppProviders';

export const viewport: Viewport = rootViewport;

export function generateMetadata(): Promise<Metadata> {
    return getRootMetadata();
}

export default function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <RootDocument>
            <AppProviders>{children}</AppProviders>
        </RootDocument>
    );
}
