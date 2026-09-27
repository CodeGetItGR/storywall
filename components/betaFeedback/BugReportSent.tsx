'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function BugReportSent({ onCloseAction }: { onCloseAction: () => void }) {
    const t = useTranslations('BugReport');

    return (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
            {/* Confirmation */}
            <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
            <p role="status" className="text-base font-semibold text-ink">
                {t('sent')}
            </p>

            {/* Actions */}
            <button type="button" onClick={onCloseAction} className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-ink/90">
                {t('close')}
            </button>
        </div>
    );
}
