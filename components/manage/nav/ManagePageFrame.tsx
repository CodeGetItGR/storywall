// components/manage/nav/ManagePageFrame.tsx
'use client';

import type { ReactNode } from 'react';

import { ManageShell } from '@/components/manage/nav/ManageShell';
import { useManageNav } from '@/hooks/useManageNav';
import type { ManagePage } from '@/lib/manageSections';

/**
 * A dashboard page with its own route (Invitations & QR codes, Vendors), inside the dashboard's frame.
 * `wide` lets a two-column page (Invitations & QR codes) use max-w-5xl instead of the dashboard's max-w-2xl.
 */
export function ManagePageFrame({ active, wide = false, children }: { active: ManagePage; wide?: boolean; children: ReactNode }) {
    const nav = useManageNav();

    return (
        <ManageShell nav={nav} active={active}>
            {/* Page content */}
            <div className={wide ? 'max-w-5xl' : 'max-w-2xl'}>{children}</div>
        </ManageShell>
    );
}
