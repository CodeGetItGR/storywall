'use client';

import type { ReactNode } from 'react';

import { AccountSidebarContent } from '@/components/account/AccountSidebarContent';
import { cn } from '@/lib/utils';
import { useAccountPanel } from '@/providers/AccountPanelProvider';

export function AccountPanelShell({ children }: { children: ReactNode }) {
    const { open, closeAccount } = useAccountPanel();

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* Sidebar */}
            <div aria-hidden={!open} data-open={open} className={cn('account-panel-sidebar absolute inset-0 lg:hidden', !open && 'pointer-events-none')}>
                <AccountSidebarContent onCloseAction={closeAccount} />
            </div>

            {/* Page */}
            <div
                onClick={open ? closeAccount : undefined}
                data-open={open}
                className="account-panel-page relative h-full w-full overflow-hidden bg-background lg:bg-transparent"
            >
                {/* Page content */}
                <div inert={open || undefined} className="h-full w-full">
                    {children}
                </div>
            </div>
        </div>
    );
}
