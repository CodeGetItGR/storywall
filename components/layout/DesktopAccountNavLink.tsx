import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export function DesktopAccountNavLink({
    href,
    icon: Icon,
    label,
    active,
    expanded,
}: {
    href: string;
    icon: LucideIcon;
    label: string;
    active: boolean;
    expanded: boolean;
}) {
    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            title={expanded ? undefined : label}
            className={cn(
                'flex min-h-11 items-center rounded-full text-sm font-semibold ring-1 transition-[background-color,transform,color] active:scale-[0.99]',
                expanded ? 'gap-3 px-4 py-2.5' : 'justify-center px-0 py-2.5',
                active
                    ? 'bg-white/18 text-white ring-white/70'
                    : 'bg-white/10 text-white/88 ring-white/14 hover:bg-white/16 hover:text-white'
            )}
        >
            <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-white' : 'text-white/80')} aria-hidden="true" strokeWidth={active ? 2.3 : 1.8} />
            <span className={cn('truncate transition-opacity', expanded ? 'opacity-100' : 'sr-only opacity-0')}>{label}</span>
        </Link>
    );
}
