import type { MouseEventHandler, ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';

const TILE_CLASS = 'flex w-[4.5rem] flex-col items-center gap-1.5 rounded-2xl px-1 py-1.5 focus-ring transition-colors hover:bg-surface-muted';
const LABEL_CLASS = 'line-clamp-2 text-center text-xs leading-tight font-medium text-ink';

interface QuickActionTileProps {
    icon: ReactNode;
    label: string;
    // A link, or a button when null.
    href: string | null;
    onClick?: () => void;
    // A link's own click handler (e.g. to open something in place).
    onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
}

// One tile of the feed's quick actions: an icon over its label.
export function QuickActionTile({ icon, label, href, onClick, onLinkClick }: QuickActionTileProps) {
    if (href) {
        return (
            <AppLink href={href} onClick={onLinkClick} className={TILE_CLASS}>
                {icon}
                <span className={LABEL_CLASS}>{label}</span>
            </AppLink>
        );
    }

    return (
        <button type="button" onClick={onClick} className={TILE_CLASS}>
            {icon}
            <span className={LABEL_CLASS} aria-live="polite">
                {label}
            </span>
        </button>
    );
}
