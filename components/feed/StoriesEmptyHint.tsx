'use client';

import { useLocale, useTranslations } from 'next-intl';

// Sits beside the "Your story" slot while nobody has shared a story. The
// stories module's name follows the event type, so the copy does too.
export function StoriesEmptyHint({ storiesName, canCompose }: { storiesName: string; canCompose: boolean }) {
    const t = useTranslations('StoriesRow');
    const locale = useLocale();

    return (
        <div className="flex min-h-15.5 min-w-0 flex-col justify-center">
            <p className="text-sm font-semibold text-ink">{t('emptyTitle', { name: storiesName.toLocaleLowerCase(locale) })}</p>
            {canCompose && <p className="mt-0.5 text-xs text-ink-muted">{t('emptyBody')}</p>}
        </div>
    );
}
