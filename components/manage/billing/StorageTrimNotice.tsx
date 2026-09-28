import { AlertTriangle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatDate } from '@/lib/datetime';

// Shown while a removal of the media above a lowered storage limit is scheduled.
export function StorageTrimNotice({ dueAt }: { dueAt: string | null }) {
    const t = useTranslations('EventPlanSettingsPage.storageTrim');
    const locale = useLocale();
    if (!dueAt) return null;

    return (
        <div role="alert" className="flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="min-w-0">
                <p className="font-semibold text-ink">{t('title')}</p>
                <p className="mt-1 text-ink-muted">{t('body', { date: formatDate(locale, dueAt, { dateStyle: 'medium', timeStyle: 'short' }) })}</p>
            </div>
        </div>
    );
}
