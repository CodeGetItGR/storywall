'use client';

import { useCallback } from 'react';

import { resetDemo } from '@/lib/demo/demoBootstrap';

export function useResetDemo(eventTypeKey: string): () => void {
    return useCallback(() => resetDemo(eventTypeKey), [eventTypeKey]);
}
