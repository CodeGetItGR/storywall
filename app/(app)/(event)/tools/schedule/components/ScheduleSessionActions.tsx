'use client';

import { PencilLine, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EventSessionResponseDto } from '@/lib/api/types';

export function ScheduleSessionActions({
    session,
    onEditAction,
    onDeleteAction,
    deleteDisabled,
}: {
    session: EventSessionResponseDto;
    onEditAction: (session: EventSessionResponseDto) => void;
    onDeleteAction: (session: EventSessionResponseDto) => void;
    deleteDisabled: boolean;
}) {
    const t = useTranslations('SchedulePage');

    function handleEditClick() {
        onEditAction(session);
    }

    function handleDeleteClick() {
        onDeleteAction(session);
    }

    return (
        <div className="flex shrink-0 items-center gap-1">
            <button
                type="button"
                onClick={handleEditClick}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-ink-muted transition-colors hover:border-primary/20 hover:bg-primary-light hover:text-primary-dark"
                aria-label={t('host.editSession', { title: session.title })}
            >
                <PencilLine className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleteDisabled}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-ink-muted transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t('host.deleteSession', { title: session.title })}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
