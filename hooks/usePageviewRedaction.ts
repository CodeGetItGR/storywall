'use client';

import { useParams } from 'next/navigation';
import { useCallback } from 'react';

import { redactPageviewUrl } from '@/lib/vercelInsights';

type PageviewEvent = { url: string };

// Web Analytics' beforeSend for the current page. A new page's params arrive with its page view:
// Analytics swaps in the new beforeSend before it sends the view.
export function usePageviewRedaction() {
    const params = useParams();
    return useCallback(<T extends PageviewEvent>(event: T): T => redactPageviewUrl(event, params ?? {}), [params]);
}
