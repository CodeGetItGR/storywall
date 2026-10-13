import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export function DesktopAccountNavLink({
    href,
    icon: Icon,
    label,
    active,
    expanded,
    badgeCount = 0,
}: {
    href: string;
    icon: LucideIcon;
    label: string;
    active: boolean;
    expanded: boolean;
    // Count pill: at the end of the row when expanded, on the icon's corner when collapsed. Hidden when zero.
    badgeCount?: number;
}) {
    const badge = badgeCount > 9 ? '9+' : String(badgeCount);

    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={expanded ? undefined : label}
            title={expanded ? undefined : label}
            // The icon keeps the same padding in both states and the width follows the rail's timing, so nothing snaps on collapse.
            className={cn(
                'relative flex min-h-11 items-center rounded-full px-2.5 py-2.5 text-sm font-semibold whitespace-nowrap ring-1 transition-[max-width,background-color,color,box-shadow] duration-700 ease-out active:scale-[0.99]',
                expanded ? 'max-w-52' : 'max-w-10',
                active ? 'bg-white/18 text-white ring-white/70' : 'bg-white/10 text-white/88 ring-white/14 hover:bg-white/16 hover:text-white',
            )}
        >
            <Icon
                className={cn('h-5 w-5 shrink-0 transition-colors duration-200 ease-out', active ? 'text-white' : 'text-white/80')}
                aria-hidden="true"
                strokeWidth={active ? 2.3 : 1.8}
            />
            <span
                className={cn(
                    'min-w-0 overflow-hidden transition-[max-width,margin,opacity] ease-out',
                    expanded ? 'ml-3 max-w-36 opacity-100 duration-700' : 'ml-0 max-w-0 opacity-0 duration-200',
                )}
            >
                {label}
            </span>
            {badgeCount > 0 && (
                <span
                    className={cn(
                        'absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white tabular-nums transition-[top,right,translate] duration-700 ease-out',
                        expanded ? 'top-1/2 right-3 -translate-y-1/2' : '-top-1.5 -right-1.5 translate-y-0',
                    )}
                >
                    {badge}
                </span>
            )}
        </Link>
    );
}
