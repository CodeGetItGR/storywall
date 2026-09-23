// import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell>
            {/*<LanguageSwitcher className="fixed top-3 right-3 z-50" />*/}
            {children}
        </AppShell>
    );
}
