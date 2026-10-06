'use client';

import { useIsPrimaryHost } from '@/hooks/useIsPrimaryHost';
import { useContentAccessMode } from '@/providers/EventProvider';

// Why the viewer can't buy anything for this event, or null when they can.
export type PurchaseBlock = 'demo' | 'primaryHostOnly';

// The demo has no checkout, so it shows the offers with buying disabled.
export function usePurchaseBlock(): PurchaseBlock | null {
    const isPrimaryHost = useIsPrimaryHost();
    const accessMode = useContentAccessMode();

    if (accessMode === 'demoVisitor') return 'demo';
    return isPrimaryHost ? null : 'primaryHostOnly';
}
