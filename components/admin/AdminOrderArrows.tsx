'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { MoveDirection } from '@/lib/sortOrder';

const ARROW_BUTTON = 'rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-30';

// The up/down arrows every admin catalog uses to change a row's order.
export function AdminOrderArrows({
    id,
    name,
    isFirst,
    isLast,
    disabled = false,
    disabledHint,
    onMoveAction,
}: {
    id: string;
    name: string;
    isFirst: boolean;
    isLast: boolean;
    disabled?: boolean;
    // Shown on hover when the arrows are off for a reason the admin can fix.
    disabledHint?: string;
    onMoveAction: (id: string, direction: MoveDirection) => void;
}) {
    const t = useTranslations('AdminPage.order');

    function handleUp() {
        onMoveAction(id, 'up');
    }

    function handleDown() {
        onMoveAction(id, 'down');
    }

    return (
        <div className="flex gap-1" title={disabled ? disabledHint : undefined}>
            <button type="button" onClick={handleUp} disabled={disabled || isFirst} aria-label={t('moveUp', { name })} className={ARROW_BUTTON}>
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={handleDown} disabled={disabled || isLast} aria-label={t('moveDown', { name })} className={ARROW_BUTTON}>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}
