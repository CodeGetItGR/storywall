import { ReactNode } from 'react';

import { Logo } from '@/components/common/Logo';

interface AuthLayoutProps {
    children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-dvh flex flex-col justify-center lg:h-screen lg:flex-row lg:justify-start bg-surface-muted/30">
            {/* Brand panel */}
            <div className="relative flex shrink-0 items-center justify-center overflow-hidden py-5 lg:py-0 lg:w-1/2 lg:h-screen">
                <Logo
                    direction="col"
                    iconClassName="h-16 w-auto sm:h-18 lg:h-22"
                    wordmarkClassName="h-9 w-auto sm:h-10 lg:h-12"
                    wordmarkVariant="gradient"
                    className="relative"
                />
            </div>

            {/* Form panel */}
            <div className="flex flex-col items-center justify-center px-6 py-10 lg:w-1/2 lg:py-12">
                <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl shadow-black/10 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
                    {children}
                </div>
            </div>
        </div>
    );
}
