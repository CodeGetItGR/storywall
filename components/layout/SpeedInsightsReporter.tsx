'use client';

import { SpeedInsights } from '@vercel/speed-insights/next';

import { redactVitalUrl } from '@/lib/speedInsights';

// Web Vitals for the Speed Insights dashboard on Vercel. A client component because beforeSend is a function.
export function SpeedInsightsReporter() {
    return <SpeedInsights beforeSend={redactVitalUrl} />;
}
