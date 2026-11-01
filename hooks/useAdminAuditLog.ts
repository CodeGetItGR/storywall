'use client';

import { useQuery } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useState } from 'react';

import { auditLogKeys, auditLogPath, type AuditLogQuery, isAuditAction, isUuid } from '@/lib/adminAuditLog';
import { api } from '@/lib/api/client';
import type { Page } from '@/lib/api/pagination';
import type { AdminAuditAction, AdminAuditLogResponseDto } from '@/lib/api/types';

// GET /api/admin/audit-log, newest first. The previous page stays on screen while the next loads.
export function useAdminAuditLog(query: AuditLogQuery, enabled = true) {
    return useQuery({
        queryKey: auditLogKeys.list(query),
        queryFn: () => api.get<Page<AdminAuditLogResponseDto>>(auditLogPath(query)),
        placeholderData: (previous) => previous,
        enabled,
    });
}

export type AuditAdminFilter = { id: string; label: string };

// The Audit log section: filters by admin (picked from a row), event (an id typed or picked from a
// row) and action, a page, and the entry open in the drawer. Any filter change goes back to page 1.
export function useAuditLogPanel() {
    const [page, setPage] = useState(0);
    const [admin, setAdmin] = useState<AuditAdminFilter | null>(null);
    const [eventInput, setEventInput] = useState('');
    const [action, setActionState] = useState<AdminAuditAction | null>(null);
    const [selected, setSelected] = useState<AdminAuditLogResponseDto | null>(null);

    const eventText = eventInput.trim();
    const eventId = isUuid(eventText) ? eventText.toLowerCase() : null;
    const eventInvalid = eventText.length > 0 && !eventId;
    const query = useAdminAuditLog({ page, adminUserId: admin?.id ?? null, eventId, action });

    const filterByAdmin = useCallback((next: AuditAdminFilter | null) => {
        setAdmin(next);
        setPage(0);
    }, []);
    const clearAdmin = useCallback(() => filterByAdmin(null), [filterByAdmin]);
    const handleEventChange = useCallback((changeEvent: ChangeEvent<HTMLInputElement>) => {
        setEventInput(changeEvent.currentTarget.value);
        setPage(0);
    }, []);
    const filterByEvent = useCallback((id: string) => {
        setEventInput(id);
        setPage(0);
    }, []);
    const clearEvent = useCallback(() => filterByEvent(''), [filterByEvent]);
    const handleActionChange = useCallback((changeEvent: ChangeEvent<HTMLSelectElement>) => {
        const { value } = changeEvent.currentTarget;
        setActionState(isAuditAction(value) ? value : null);
        setPage(0);
    }, []);
    const open = useCallback((entry: AdminAuditLogResponseDto) => setSelected(entry), []);
    const close = useCallback(() => setSelected(null), []);

    return {
        page,
        setPage,
        admin,
        filterByAdmin,
        clearAdmin,
        eventInput,
        eventInvalid,
        handleEventChange,
        filterByEvent,
        clearEvent,
        action,
        handleActionChange,
        hasFilters: Boolean(admin || eventId || action),
        selected,
        open,
        close,
        query,
    };
}

export type AuditLogPanelState = ReturnType<typeof useAuditLogPanel>;
