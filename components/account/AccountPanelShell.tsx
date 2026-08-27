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
            <div className="absolute inset-0" aria-hidden={!open}>
                <AccountSidebarContent onCloseAction={closeAccount} />
            </div>

            {/* Page */}
            <div
                onClick={open ? closeAccount : undefined}
                className={cn(
                    'relative h-full w-full overflow-hidden bg-background transition-[transform,border-radius,box-shadow] duration-300 ease-out',
                    open
                        ? 'translate-x-[55%] scale-[0.82] rounded-[1.75rem] shadow-[0_25px_60px_rgba(20,15,10,0.35)]'
                        : 'translate-x-0 scale-100 rounded-none shadow-none'
                )}
            >
                <div inert={open || undefined} className="h-full w-full">
                    {children}
                </div>
            </div>
        </div>
    );
}
