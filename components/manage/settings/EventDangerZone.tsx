'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function EventDangerZone({ onDeleteOpenAction, disabled }: { onDeleteOpenAction: () => void; disabled?: boolean }) {
    const t = useTranslations('ManagePage');

    return (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
            <p className="text-sm font-semibold text-rose-700">{t('settings.dangerZone.title')}</p>
            <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('settings.dangerZone.body')}</p>
            <button
                type="button"
                onClick={onDeleteOpenAction}
                disabled={disabled}
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t('settings.dangerZone.delete')}
            </button>
        </div>
    );
}
