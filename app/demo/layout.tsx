'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { AccountPanelShell } from '@/components/account/AccountPanelShell';
import { DemoUnavailable } from '@/components/demo/DemoUnavailable';
import { ResetDemoButton } from '@/components/demo/ResetDemoButton';
import { MobileTabBar } from '@/components/layout';
import { startDemoMocking, stopDemoMocking } from '@/lib/demo/mockWorker';
import { AccountPanelProvider } from '@/providers/AccountPanelProvider';
import { ComposerProvider } from '@/providers/ComposerProvider';
import { DemoAuthProvider } from '@/providers/demo/DemoAuthProvider';
import { DemoEventProvider } from '@/providers/demo/DemoEventProvider';
import { ModalProvider } from '@/providers/ModalProvider';

type MockStatus = 'starting' | 'ready' | 'failed';

export default function DemoLayout({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<MockStatus>('starting');

    useEffect(() => {
        let cancelled = false;

        startDemoMocking()
            .then(() => {
                if (!cancelled) setStatus('ready');
            })
            .catch(() => {
                if (!cancelled) setStatus('failed');
            });

        // Stops the service worker's interception when navigating away from /demo (client-side,
        // no full reload) — otherwise it would keep mocking fetches for the rest of the real app
        // too. See docs/superpowers/plans/2026-09-05-demo-event.md's design notes, point 3.
        return () => {
            cancelled = true;
            stopDemoMocking();
        };
    }, []);

    if (status === 'failed') {
        return <DemoUnavailable />;
    }

    if (status === 'starting') {
        return null;
    }

    return (
        <DemoAuthProvider>
            <DemoEventProvider>
                <ComposerProvider>
                    <ModalProvider>
                        <AccountPanelProvider>
                            <AccountPanelShell>
                                <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
                                    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background pb-20 lg:pb-0">
                                        <div className="flex items-center justify-end gap-2 px-4 py-2">
                                            <ResetDemoButton />
                                        </div>
                                        {children}
                                    </main>
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
