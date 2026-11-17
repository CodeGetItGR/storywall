// import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ReactNode } from 'react';

import { CreateEventDialogHost } from '@/components/event/create/wizard/CreateEventDialogHost';
import { AppShell } from '@/components/layout/AppShell';

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell>
            {/*<LanguageSwitcher className="fixed top-3 right-3 z-50" />*/}
            {children}
            {/* Create wizard */}
            <CreateEventDialogHost />
        </AppShell>
    );
}
