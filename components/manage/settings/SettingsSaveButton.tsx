'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

type SettingsSaveButtonProps = {
    canSave: boolean;
    isSaving: boolean;
    errorMessage: string | null;
};

// The foot of every Settings part editor: its error, then "Save changes".
export function SettingsSaveButton({ canSave, isSaving, errorMessage }: SettingsSaveButtonProps) {
    const t = useTranslations('ManagePage.settings');

    return (
        <div className="flex flex-col gap-3">
            {errorMessage && (
                <p role="alert" className="text-xs text-rose-500">
                    {errorMessage}
                </p>
            )}
            <button
                type="submit"
                disabled={!canSave || isSaving}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto lg:self-end"
            >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : t('save')}
            </button>
        </div>
    );
}
