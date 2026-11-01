'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useAdminVendorMessages, useSetVendorMessageStatus } from '@/hooks/useAdminVendorMessages';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { VENDOR_MESSAGE_FILTERS, type VendorMessageFilter } from '@/lib/adminVendorMessages';
import type { VendorContactMessageDto, VendorContactStatus } from '@/lib/api/types';

// The inbox: a status filter, a page, the open message and its status change.
export function useVendorMessagesPanel() {
    const t = useTranslations('AdminPage.vendorMessagesPanel');
    const toErrorMessage = useApiErrorMessage();
    const [status, setStatusFilter] = useState<VendorContactStatus | null>('NEW');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<VendorContactMessageDto | null>(null);
    const [error, setError] = useState<string | null>(null);
    const query = useAdminVendorMessages(status, page);
    const setStatus = useSetVendorMessageStatus();

    // The segmented control can't hold null, so "All" travels as 'ALL'.
    const changeFilter = useCallback((next: VendorMessageFilter) => {
        setStatusFilter(next === 'ALL' ? null : next);
        setPage(0);
    }, []);

    const filterOptions = useMemo(() => VENDOR_MESSAGE_FILTERS.map((value) => ({ value, label: t(`filters.${value}`) })), [t]);

    const open = useCallback((message: VendorContactMessageDto) => {
        setError(null);
        setSelected(message);
    }, []);

    const openById = useCallback(
        (id: string) => {
            const message = query.data?.content.find((item) => item.id === id);
            if (message) open(message);
        },
        [open, query.data],
    );

    const close = useCallback(() => setSelected(null), []);

    const mark = useCallback(
        async (next: VendorContactStatus) => {
            if (!selected) return;
            setError(null);
            try {
                setSelected(await setStatus.mutateAsync({ id: selected.id, status: next }));
            } catch (e) {
                setError(toErrorMessage(e));
            }
        },
        [selected, setStatus, toErrorMessage],
    );

    return {
        status,
        filter: (status ?? 'ALL') as VendorMessageFilter,
        filterOptions,
        changeFilter,
        page,
        setPage,
        query,
        selected,
        open,
        openById,
        close,
        mark,
        isMarking: setStatus.isPending,
        error,
    };
}
