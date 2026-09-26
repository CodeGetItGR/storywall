'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

// Shown while AuthProvider retries a session check the server couldn't answer.
// The user is still signed in, so this waits rather than offering a login.
export function SessionUnavailableState({ className }: { className?: string }) {
    const t = useTranslations('SessionUnavailable');

    return (
        <div role="status" className={cn('flex h-full flex-col items-center justify-center gap-2 bg-background px-6 text-center', className)}>
            <Loader2 className="mb-1 h-6 w-6 animate-spin text-ink-muted" aria-hidden="true" />
            <p className="text-base font-semibold text-ink">{t('title')}</p>
            <p className="max-w-sm text-sm text-ink-muted">{t('description')}</p>
        </div>
    );
}
