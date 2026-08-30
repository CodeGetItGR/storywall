'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

export interface AdminLayoutShell {
    user: ReturnType<typeof useAuth>['user'];
    isBootstrapping: boolean;
    mobileNavOpen: boolean;
    signOutOpen: boolean;
    handleLogout: () => Promise<void>;
    handleOpenMobileNav: () => void;
    handleCloseMobileNav: () => void;
    handleOpenSignOut: () => void;
    handleCloseSignOut: () => void;
    handleConfirmSignOut: () => Promise<void>;
}

export function useAdminLayoutShell(): AdminLayoutShell {
    const router = useRouter();
    const { user, isBootstrapping, logout } = useAuth();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);

    useEffect(() => {
        if (isBootstrapping) return;
        if (!user) {
            router.replace(routes.login);
        }
    }, [isBootstrapping, router, user]);

    async function handleLogout() {
        await logout();
        router.push(routes.login);
    }

    function handleOpenMobileNav() {
        setMobileNavOpen(true);
    }

    function handleCloseMobileNav() {
        setMobileNavOpen(false);
    }

    function handleOpenSignOut() {
        setSignOutOpen(true);
    }

    function handleCloseSignOut() {
        setSignOutOpen(false);
    }

    async function handleConfirmSignOut() {
        setSignOutOpen(false);
        await handleLogout();
    }

    return {
        user,
        isBootstrapping,
        mobileNavOpen,
        signOutOpen,
        handleLogout,
        handleOpenMobileNav,
        handleCloseMobileNav,
        handleOpenSignOut,
        handleCloseSignOut,
        handleConfirmSignOut,
    };
}
