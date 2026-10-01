'use client';

import { CirclePause, CirclePlay, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CollaboratorStatusPill } from '@/components/admin/CollaboratorStatusPill';
import type { CollaboratorResponseDto } from '@/lib/api/types';

const SECONDARY_BUTTON =
    'inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink';

export function CollaboratorPaneHeader({
    collaborator,
    onEditAction,
    onStatusAction,
}: {
    collaborator: CollaboratorResponseDto;
    onEditAction: () => void;
    onStatusAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const suspended = collaborator.status === 'SUSPENDED';

    return (
        <header className="space-y-2 border-b border-border pb-4">
            {/* Identity + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <h2 className="truncate text-xl font-semibold tracking-tight text-ink">{collaborator.name}</h2>
                    <span className="font-mono text-[11px] text-ink-faint">{collaborator.contactEmail}</span>
                    <CollaboratorStatusPill status={collaborator.status} />
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onStatusAction} className={SECONDARY_BUTTON}>
                        {suspended ? <CirclePlay className="h-4 w-4" /> : <CirclePause className="h-4 w-4" />}
                        {suspended ? t('reactivate.action') : t('suspend.action')}
                    </button>
                    <button type="button" onClick={onEditAction} className={SECONDARY_BUTTON}>
                        <Pencil className="h-4 w-4" />
                        {t('edit')}
                    </button>
                </div>
            </div>

            {/* Notes */}
            {collaborator.notes && <p className="max-w-3xl text-sm whitespace-pre-line text-ink-muted">{collaborator.notes}</p>}
        </header>
    );
}
