'use client';

import { useSyncExternalStore } from 'react';

import { isApiDown, subscribeApiHealth } from '@/lib/apiHealth';

function serverSnapshot() {
    return false;
}

export function useApiDown(): boolean {
    return useSyncExternalStore(subscribeApiHealth, isApiDown, serverSnapshot);
}
