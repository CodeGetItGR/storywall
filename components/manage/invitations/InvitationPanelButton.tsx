'use client';

import { QrCode, UserCog } from 'lucide-react';
import { useCallback } from 'react';

import { cn } from '@/lib/utils';

import type { InvitationPanel } from './shared';

export function InvitationPanelButton({
    item,
    active,
    label,
    onSelectAction,
}: {
    item: InvitationPanel;
    active: boolean;
    label: string;
    onSelectAction: (item: InvitationPanel) => void;
}) {
    const handleClick = useCallback(() => {
        onSelectAction(item);
    }, [item, onSelectAction]);

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                active ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            )}
        >
            {item === 'qr' && <QrCode className="h-3.5 w-3.5" />}
            {item === 'coHosts' && <UserCog className="h-3.5 w-3.5" />}
            {label}
        </button>
    );
}
