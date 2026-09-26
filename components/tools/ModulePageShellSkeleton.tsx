import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ModulePageMaxWidth = 'xl' | '2xl' | '3xl' | '5xl';

const maxWidthClassName: Record<ModulePageMaxWidth, string> = {
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '5xl': 'max-w-5xl',
};

// Mirrors ModulePageShell's frame (back button, centred title, optional
// subtitle) so a tool page's skeleton lines up with the page that replaces it.
export function ModulePageShellSkeleton({
    maxWidth = '2xl',
    withSubtitle = false,
    withAction = false,
    children,
    className,
}: {
    maxWidth?: ModulePageMaxWidth;
    withSubtitle?: boolean;
    withAction?: boolean;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('mx-auto px-4 pb-8', maxWidthClassName[maxWidth], className)}>
            {/* Header */}
            <div className="flex items-center gap-3 py-4" aria-hidden="true">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 justify-center">
                    <Skeleton className="h-4 w-32 rounded-full" />
                </div>
                {withAction ? <Skeleton className="h-9 w-9 shrink-0 rounded-full" /> : <span className="h-9 w-9 shrink-0" />}
            </div>

            {/* Subtitle */}
            {withSubtitle && (
                <div className="mb-5 flex flex-col items-center gap-2" aria-hidden="true">
                    <Skeleton className="h-3 w-64 max-w-full rounded-full" />
                    <Skeleton className="h-3 w-44 rounded-full" />
                </div>
            )}

            {children}
        </div>
    );
}
