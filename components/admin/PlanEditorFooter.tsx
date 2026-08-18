'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

export function PlanEditorFooter({
    footerSlot,
    formId,
    canSave,
    isSaving,
    changeCount,
}: {
    footerSlot: HTMLDivElement | null;
    formId: string;
    canSave: boolean;
    isSaving: boolean;
    changeCount: number;
}) {
    const t = useTranslations('AdminPage');

    if (!footerSlot) return null;

    return createPortal(
        <>
            {/* Footer */}
            <p className={cn('text-xs font-semibold', canSave ? 'text-ink' : 'text-ink-muted')}>
                {canSave ? t('plans.pendingChanges', { count: changeCount }) : t('plans.noPendingChanges')}
            </p>
            <button
                type="submit"
                form={formId}
                disabled={!canSave || isSaving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(36,31,26,0.14)] transition hover:bg-ink/90 disabled:opacity-50"
            >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                {t('save')}
            </button>
        </>,
        footerSlot
    );
}
