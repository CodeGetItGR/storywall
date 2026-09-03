import { ReactNode } from 'react';

import { Logo } from '@/components/common/Logo';

interface AuthLayoutProps {
    children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-dvh bg-background flex flex-col justify-center lg:h-screen lg:flex-row lg:justify-start max-lg:bg-gradient-brand">
            {/* Brand panel */}
            <div className="relative flex shrink-0 items-center justify-center overflow-hidden py-10 lg:py-0 lg:w-1/2 lg:h-screen lg:bg-gradient-brand">

                <Logo
                    direction="col"
                    iconClassName="h-12 w-auto sm:h-14 lg:h-20"
                    wordmarkClassName="h-8 w-auto sm:h-9 lg:h-11 brightness-0 invert"
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
