'use client';

import { type MouseEvent, useCallback, useRef, useState } from 'react';

import { useAdminSiteNotices } from '@/hooks/useAdminSiteNotices';
import type { AdminSiteNoticeDto } from '@/lib/api/types';

// token: which opening this is. The drawer is keyed on it, so each opening starts from the saved values.
type DrawerState = { open: boolean; notice: AdminSiteNoticeDto | null; token: number };

const NO_NOTICES: AdminSiteNoticeDto[] = [];

export function useSiteNoticesPanel() {
    const query = useAdminSiteNotices();
    const notices = query.data ?? NO_NOTICES;
    const [drawer, setDrawer] = useState<DrawerState>({ open: false, notice: null, token: 0 });
    const nextToken = useRef(0);

    const open = useCallback((notice: AdminSiteNoticeDto | null) => {
        nextToken.current += 1;
        setDrawer({ open: true, notice, token: nextToken.current });
    }, []);

    const handleCreateClick = useCallback(() => open(null), [open]);

    const handleEditClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const found = notices.find((notice) => notice.id === event.currentTarget.dataset.noticeId);
            if (found) open(found);
        },
        [notices, open],
    );

    const closeDrawer = useCallback(() => setDrawer((current) => ({ ...current, open: false })), []);

    return { query, notices, drawer, handleCreateClick, handleEditClick, closeDrawer };
}
