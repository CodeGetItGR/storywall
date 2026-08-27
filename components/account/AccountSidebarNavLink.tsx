'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';

import { isPathActive } from '@/components/layout/mobile-tab-bar';
import { cn } from '@/lib/utils';

interface AccountSidebarNavLinkProps {
    href: string;
    icon: LucideIcon;
    label: string;
    onNavigateAction: () => void;
}

export function AccountSidebarNavLink({ href, icon: Icon, label, onNavigateAction }: AccountSidebarNavLinkProps) {
    const pathname = usePathname();
    const active = isPathActive(pathname, href);

    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        if (active) {
            event.preventDefault();
            return;
        }

        onNavigateAction();
    }

    return (
        <Link
            href={href}
            onClick={handleClick}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex min-h-11 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition-[background-color,transform]',
                active
                    ? 'bg-white/18 text-white ring-white/70'
                    : 'bg-white/10 text-white/88 ring-white/14 hover:bg-white/16 hover:text-white active:scale-[0.99]'
            )}
        >
            <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-white' : 'text-white/80')} aria-hidden="true" strokeWidth={active ? 2.3 : 1.8} />
            <span className="truncate">{label}</span>
        </Link>
    );
}
