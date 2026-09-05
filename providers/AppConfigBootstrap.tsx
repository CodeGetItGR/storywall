'use client';

import { usePathname } from 'next/navigation';

import { useAppConfig } from '@/hooks/useAppConfig';

export function AppConfigBootstrap() {
    const pathname = usePathname();
    // /demo mounts its own MSW-backed useAppConfig() call once mocking is ready (see
    // app/demo/layout.tsx) — this root bootstrap would otherwise race it and hit the real
    // backend before the service worker is controlling the page.
    useAppConfig({ enabled: !pathname?.startsWith('/demo') });
    return null;
}
