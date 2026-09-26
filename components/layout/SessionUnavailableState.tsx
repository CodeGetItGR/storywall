'use client';

import { useTranslations } from 'next-intl';

// Shown while AuthProvider retries a session check the server couldn't answer.
// The user is still signed in, so this waits rather than offering a login.
export function SessionUnavailableState() {
    const t = useTranslations('SessionUnavailable');

    return (
        <div role="status" className="flex h-full flex-col items-center justify-center gap-2 bg-background px-6 text-center">
            <p className="text-base font-semibold text-ink">{t('title')}</p>
            <p className="max-w-sm text-sm text-ink-muted">{t('description')}</p>
        </div>
    );
}
