'use client';

import { CircleCheck, CircleDot, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SaveStatus } from '@/lib/invitation/draftAutosave';

type EditorSaveStatusProps = { status: SaveStatus };

// Saved, saving or unsaved. A failed save and a conflict have their own message, so they show nothing here.
// Phones show only the icon; the words stay for screen readers.
export function EditorSaveStatus({ status }: EditorSaveStatusProps) {
    const t = useTranslations('InvitationEditor');
    if (status === 'error' || status === 'conflict') return <span role="status" className="sr-only" />;

    const label = status === 'saved' ? t('saved') : status === 'saving' ? t('saving') : t('unsaved');
    const Icon = status === 'saved' ? CircleCheck : status === 'saving' ? Loader2 : CircleDot;

    return (
        <span role="status" title={label} className="flex min-w-0 items-center gap-1.5 px-1 text-xs font-medium text-(--smd-editor-muted)">
            <Icon className={status === 'saving' ? 'h-4 w-4 shrink-0 animate-spin' : 'h-4 w-4 shrink-0'} aria-hidden="true" />
            <span className="sr-only truncate sm:not-sr-only">{label}</span>
        </span>
    );
}
