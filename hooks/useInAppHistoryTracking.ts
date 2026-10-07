'use client';

import { useEffect } from 'react';

import { installInAppHistoryTracking } from '@/lib/inAppHistory';

export function useInAppHistoryTracking() {
    useEffect(() => installInAppHistoryTracking(), []);
}
