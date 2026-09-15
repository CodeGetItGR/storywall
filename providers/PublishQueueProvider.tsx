'use client';

import type { ReactNode } from 'react';

import { usePublishQueueController } from '@/hooks/usePublishQueueController';
import { PublishQueueContext, usePublishQueue } from '@/providers/publishQueue/PublishQueueContext';

export function PublishQueueProvider({ children }: { children: ReactNode }) {
    const controller = usePublishQueueController();
    return <PublishQueueContext.Provider value={controller}>{children}</PublishQueueContext.Provider>;
}

export { usePublishQueue };
