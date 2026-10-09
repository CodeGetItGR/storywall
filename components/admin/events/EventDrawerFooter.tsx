'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Cancel and save for the event page's drawers; save submits the drawer's form by id.
export function EventDrawerFooter({
    formId,
    saveLabel,
    canSave,
    isSaving,
    onCancelAction,
}: {
    formId: string;
    saveLabel: string;
    canSave: boolean;
    isSaving: boolean;
    onCancelAction: () => void;
}) {
    const t = useTranslations('AdminPage');

    return (
        <div className="ml-auto flex items-center gap-2">
            <button
                type="button"
                onClick={onCancelAction}
                disabled={isSaving}
                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
            >
                {t('cancel')}
            </button>
            <button
                type="submit"
                form={formId}
                disabled={!canSave}
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
            >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {saveLabel}
            </button>
        </div>
    );
}
