// import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ReactNode } from 'react';

import { DesktopNavRail, MobileTabBar } from '@/components/layout';

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <DesktopNavRail />
            {/* lg:pl matches the 220px nav rail. Event pages add their own right rail padding. */}
            <main className="w-full min-h-screen pb-20 lg:pb-0 lg:pl-55">
                {/*<LanguageSwitcher className="fixed top-3 right-3 z-50" />*/}
                <div className="lg:max-w-none">{children}</div>
            </main>
            <MobileTabBar />
        </div>
    );
}
