'use client';

import { useState } from 'react';

import { useAdminAuditLog } from '@/hooks/useAdminAuditLog';

export const EVENT_HISTORY_PAGE_SIZE = 10;

// One event's audit entries, a page at a time.
export function useEventHistory(eventId: string) {
    const [page, setPage] = useState(0);
    const query = useAdminAuditLog({ page, size: EVENT_HISTORY_PAGE_SIZE, eventId });
    return { page, setPage, query };
}
