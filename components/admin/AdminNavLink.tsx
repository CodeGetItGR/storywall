import type { LucideIcon } from 'lucide-react';

import { AppLink } from '@/components/ui/AppLink';
import { cn } from '@/lib/utils';

// A sidebar entry that opens another address, styled like the console's section buttons.
export function AdminNavLink({
    href,
    label,
    icon: Icon,
    active = false,
    onNavigateAction,
}: {
    href: string;
    label: string;
    icon: LucideIcon;
    active?: boolean;
    onNavigateAction?: () => void;
}) {
    return (
        <AppLink
            href={href}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigateAction}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.3px] font-semibold transition-colors',
                active ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-canvas hover:text-ink',
            )}
        >
            <Icon className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
            <span className="truncate">{label}</span>
        </AppLink>
    );
}
