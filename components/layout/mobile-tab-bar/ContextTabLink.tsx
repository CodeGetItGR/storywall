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
            <Icon className={cn('h-5 w-5 transition-opacity', active ? 'text-ink opacity-100' : 'text-ink opacity-70')} aria-hidden="true" />
        </Link>
    );
}
