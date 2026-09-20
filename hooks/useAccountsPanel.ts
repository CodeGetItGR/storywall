'use client';

import { useEffect, useRef, useState } from 'react';

import { useAdminAccounts } from '@/hooks/useAdminAccounts';
import type { UserResponseDto } from '@/lib/api/types';

const PAGE_SIZE = 20;

export function useAccountsPanel() {
    const [page, setPage] = useState(0);
    const [search, setSearchState] = useState('');
    const [query, setQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<UserResponseDto | null>(null);
    const [provisionAccount, setProvisionAccount] = useState<UserResponseDto | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const accountsQuery = useAdminAccounts({ page, size: PAGE_SIZE, query });

    useEffect(() => {
        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current);
        };
    }, []);

    function setSearch(value: string) {
        setSearchState(value);
        setPage(0);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setQuery(value), 300);
    }

    function openAccount(account: UserResponseDto) {
        setSelectedAccount(account);
    }

    function provisionFor(account: UserResponseDto) {
        setSelectedAccount(null);
        setCreateOpen(false);
        setProvisionAccount(account);
    }

    return {
        page,
        setPage,
        search,
        setSearch,
        createOpen,
        setCreateOpen,
        selectedAccount,
        setSelectedAccount,
        provisionAccount,
        setProvisionAccount,
        provisionFor,
        openAccount,
        accountsQuery,
    };
}
