'use client';

import { useAppConfig } from '@/hooks/useAppConfig';

export function AppConfigBootstrap() {
    useAppConfig();
    return null;
}
