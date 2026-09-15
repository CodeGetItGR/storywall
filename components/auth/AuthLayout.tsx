import { ReactNode } from 'react';

import { Logo } from '@/components/common/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface AuthLayoutProps {
    children: ReactNode;
    showLanguageSwitcher?: boolean;
}

export function AuthLayout({ children, showLanguageSwitcher = false }: AuthLayoutProps) {
    return (
        <div className="h-full overflow-y-auto bg-surface-muted/30">
            <div className="relative flex min-h-full flex-col justify-center items-center lg:h-full">
                {/* Brand panel */}
                <div className="relative flex shrink-0 items-center justify-center overflow-hidden py-5 lg:w-1/2 lg:py-0">
                    <Logo
                        direction="col"
                        iconClassName="h-16 w-auto sm:h-18 lg:h-22"
                        wordmarkClassName="h-9 w-auto sm:h-10 lg:h-12"
                        className="relative"
                    />
                </div>

                {/* Language selection */}
                {showLanguageSwitcher && <LanguageSwitcher variant="auth" className={'mx-auto mt-5'}/>}

                {/* Form panel */}
                <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-xl shadow-black/10">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
