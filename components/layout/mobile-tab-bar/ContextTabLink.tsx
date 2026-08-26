import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { ContextNavItem } from './types';

interface ContextTabLinkProps {
    item: ContextNavItem;
    active: boolean;
    label: string;
}

export function ContextTabLink({ item, active, label }: ContextTabLinkProps) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className="flex min-w-12 flex-col items-center gap-0.5 px-3 py-1"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
        >
            <span
                className={cn(
                    'flex h-10 w-10 items-center justify-center transition-all duration-200',
                    active ? 'scale-105 opacity-100' : 'scale-100 opacity-50'
                )}
            >
                <Icon className="h-5.5 w-5.5 text-ink transition-all duration-200" aria-hidden="true" />
            </span>
        </Link>
    );
}
