'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { withRoleSheetParam } from '@/lib/memberRoles';

// Adds the one-shot ?sheet=role trigger that MyRoleSheetHost consumes.
// replace, not push: the sheet's Modal adds its own history entry for Back.
export function useOpenMyRoleSheet() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    return useCallback(() => {
        router.replace(withRoleSheetParam(pathname, searchParams.toString()), { scroll: false });
    }, [pathname, router, searchParams]);
}
