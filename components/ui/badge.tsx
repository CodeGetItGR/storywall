import React, {ReactNode} from "react";

import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'outline';

const variantMap: Record<BadgeVariant, string> = {
    default: 'bg-surface-muted text-ink-muted',
    primary: 'bg-primary-light text-primary-dark',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    destructive: 'bg-red-50 text-red-700',
    outline: 'border border-border text-ink-muted bg-transparent',
};

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
    return (
        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', variantMap[variant], className)}>
            {children}
        </span>
    );
}
