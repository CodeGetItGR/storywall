'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

import { PublicProviders } from '@/providers/PublicProviders';

const AppProviders = dynamic(() => import('@/providers/AppProviders').then((module) => module.AppProviders));

export function Providers({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    if (pathname === '/') return <PublicProviders>{children}</PublicProviders>;

    const isDemoRoute = pathname?.startsWith('/demo') ?? false;
    return <AppProviders isDemoRoute={isDemoRoute}>{children}</AppProviders>;
}
