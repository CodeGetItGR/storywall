import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// The design's page column: up to 1220 px with 32 px gutters, 20 px gutters up to 760 px, 18 px up to 600 px.
export function WeddingWrap({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('mx-auto w-[calc(100%-36px)] min-[601px]:w-[calc(100%-40px)] min-[761px]:w-[min(1220px,calc(100%-64px))]', className)}>
            {children}
        </div>
    );
}
