import type { ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export default function Section({
    title,
    description,
    icon: Icon,
    action,
    divider,
    children,
    className,
}: {
    title?: string;
    description?: string;
    icon?: ElementType;
    action?: ReactNode;
    divider?: boolean;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn(divider && 'border-t border-ink/10 pt-5', className)}>
            {(title || action) && (
                <div className={cn('flex items-center justify-between gap-3', children && 'mb-3')}>
                    <div className="flex min-w-0 items-center gap-1.5">
                        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />}
                        <div className="min-w-0">
                            {title && <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">{title}</p>}
                            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
                        </div>
                    </div>
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}
