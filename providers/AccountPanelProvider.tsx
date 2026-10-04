'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';

interface AccountPanelContextValue {
    open: boolean;
    openAccount: () => void;
    closeAccount: () => void;
}

const AccountPanelContext = createContext<AccountPanelContextValue | null>(null);

export function AccountPanelProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const openAccount = useCallback(() => setOpen(true), []);
    const closeAccount = useCallback(() => setOpen(false), []);
    const { requestClose } = useOverlayHistory(open, closeAccount);

    useEffect(() => {
        if (!open) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') requestClose();
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, requestClose]);

    useBodyScrollLock(open);

    return <AccountPanelContext.Provider value={{ open, openAccount, closeAccount: requestClose }}>{children}</AccountPanelContext.Provider>;
}

export function useAccountPanel() {
    const context = useContext(AccountPanelContext);
    if (!context) {
        throw new Error('useAccountPanel must be used within an AccountPanelProvider');
    }
    return context;
}
