// components/manage/nav/ManagePageFrame.tsx
'use client';

import type { ReactNode } from 'react';

import { ManageShell } from '@/components/manage/nav/ManageShell';
import { useManageNav } from '@/hooks/useManageNav';
import type { ManagePage } from '@/lib/manageSections';

/** A dashboard page with its own route (Invitations & QR codes, Vendors), inside the dashboard's frame. */
export function ManagePageFrame({ active, children }: { active: ManagePage; children: ReactNode }) {
    const nav = useManageNav();

    return (
        <ManageShell nav={nav} active={active}>
            {/* Page content */}
            <div className="max-w-2xl">{children}</div>
        </ManageShell>
    );
}
