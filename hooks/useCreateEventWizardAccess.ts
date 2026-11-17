'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

// Who may use the wizard page: everyone but admins, who go to their console as before. Signed-out
// visitors and unverified accounts are let in; the account step deals with them before payment.
export function useCreateEventWizardAccess(): { isBlocked: boolean } {
    const router = useRouter();
    const { user, isBootstrapping } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        if (!isBootstrapping && isAdmin) router.replace(routes.admin);
    }, [isAdmin, isBootstrapping, router]);

    return { isBlocked: isBootstrapping || isAdmin };
}
