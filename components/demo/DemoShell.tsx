'use client';

import type { ReactNode } from 'react';

import { AccountPanelShell } from '@/components/account/AccountPanelShell';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { MobileTabBar } from '@/components/layout';
import { useDemoMediaUrlRefresh } from '@/hooks/useDemoMediaUrlRefresh';
import { useResetDemo } from '@/hooks/useResetDemo';
import type { DemoSession } from '@/lib/demo/demoSession';
import { AccountPanelProvider } from '@/providers/AccountPanelProvider';
import { ComposerProvider } from '@/providers/ComposerProvider';
import { DemoAuthProvider } from '@/providers/demo/DemoAuthProvider';
import { DemoEventProvider } from '@/providers/demo/DemoEventProvider';
import { ModalProvider } from '@/providers/ModalProvider';

type DemoShellProps = {
    session: DemoSession;
    etag: string | null;
    presignedUrlsValidUntil: string | null;
    children: ReactNode;
};

export function DemoShell({ session, etag, presignedUrlsValidUntil, children }: DemoShellProps) {
    useDemoMediaUrlRefresh(session, etag, presignedUrlsValidUntil);
    const handleReset = useResetDemo(session.eventTypeKey);

    return (
        <DemoAuthProvider session={session}>
            <DemoEventProvider session={session}>
                <ComposerProvider>
                    <ModalProvider>
                        <AccountPanelProvider>
                            <AccountPanelShell>
                                <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
                                    {/* Demo notice */}
                                    <DemoBanner onResetAction={handleReset} />
                                    {/* Content */}
                                    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background pb-20 lg:pb-0">{children}</main>
                                    <MobileTabBar />
                                </div>
                            </AccountPanelShell>
                        </AccountPanelProvider>
                    </ModalProvider>
                </ComposerProvider>
            </DemoEventProvider>
        </DemoAuthProvider>
    );
}
