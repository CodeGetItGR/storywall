'use client';

import { type MouseEvent, useCallback, useEffect, useState } from 'react';

import { formatRecordHash, NEW_RECORD, parseRecordHash } from '@/lib/adminRecordRouting';
import { pushPageEntry, replacePageUrl } from '@/lib/overlayHistory';

function currentRecord(root: string): string | null {
    return typeof window === 'undefined' ? null : parseRecordHash(root, window.location.hash);
}

// Which page of an admin section the address shows: its list, the new form, or one record. Rows and
// their links carry the record in data-record-id.
export function useAdminRecordPage(root: string) {
    const [record, setRecord] = useState<string | null>(() => currentRecord(root));

    useEffect(() => {
        function syncFromHash() {
            setRecord(currentRecord(root));
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, [root]);

    const push = useCallback(
        (next: string | null) => {
            pushPageEntry(formatRecordHash(root, next));
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        },
        [root],
    );

    // For a page that has no business in Back: a saved form, or a record that no longer exists.
    const replace = useCallback(
        (next: string | null) => {
            replacePageUrl(formatRecordHash(root, next));
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        },
        [root],
    );

    const handleNewClick = useCallback(() => push(NEW_RECORD), [push]);
    const showList = useCallback(() => replace(null), [replace]);

    // Next's Link sets the hash with pushState, which fires no hashchange.
    const handleBackClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            push(null);
        },
        [push],
    );

    // A modified click keeps its usual meaning, such as opening a new tab.
    const handleRecordLinkClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey) return;
            event.preventDefault();
            push(event.currentTarget.dataset.recordId ?? null);
        },
        [push],
    );

    const handleRecordRowClick = useCallback(
        (event: MouseEvent<HTMLTableRowElement>) => {
            if ((event.target as Element).closest('a, button')) return;
            const id = event.currentTarget.dataset.recordId;
            if (id) push(id);
        },
        [push],
    );

    return {
        isNew: record === NEW_RECORD,
        recordId: record === NEW_RECORD ? null : record,
        push,
        replace,
        showList,
        handleNewClick,
        handleBackClick,
        handleRecordLinkClick,
        handleRecordRowClick,
    };
}
