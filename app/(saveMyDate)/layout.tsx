import type { Metadata, Viewport } from 'next';
import { type ReactNode } from 'react';

import { RootDocument } from '@/components/layout/RootDocument';
import { getRootMetadata, rootViewport } from '@/lib/rootMetadata';

export const viewport: Viewport = rootViewport;

export function generateMetadata(): Promise<Metadata> {
    return getRootMetadata();
}

// A root layout of its own: invitations render on the server and need none
// of the app's providers or messages.
export default function SaveMyDateLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <RootDocument documentScroll messages={{}}>
            {children}
        </RootDocument>
    );
}
