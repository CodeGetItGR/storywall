import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type LoadingStateProps = {
    label?: ReactNode;
    size?: 'sm' | 'md';
    className?: string;
};

export function LoadingState({ label, size = 'sm', className }: LoadingStateProps) {
    return (
        <div role="status" className={cn('flex items-center justify-center gap-2 text-sm text-ink-muted', className)}>
            <Loader2 className={cn('animate-spin', size === 'md' ? 'h-6 w-6' : 'h-4 w-4')} aria-hidden="true" />
            {label}
        </div>
    );
}
