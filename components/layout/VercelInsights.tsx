'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { usePageviewRedaction } from '@/hooks/usePageviewRedaction';
import { redactVitalUrl } from '@/lib/vercelInsights';

// Page views and Web Vitals for Vercel's dashboards. A client component because beforeSend is a function.
export function VercelInsights() {
    const redactPageview = usePageviewRedaction();

    return (
        <>
            <Analytics beforeSend={redactPageview} />
            <SpeedInsights beforeSend={redactVitalUrl} />
        </>
    );
}
