'use client';

import { Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

// Shared links carry the host's current language (see useShareLink).
export function ShareLanguageNote({ className }: { className?: string }) {
    const t = useTranslations('ManagePage');

    return (
        <p className={cn('text-xs leading-relaxed text-ink-faint', className)}>
            <Languages className="mr-1.5 inline-block h-3.5 w-3.5 align-[-0.2em]" aria-hidden="true" />
            {t('invitations.shareLanguageNote')}
        </p>
    );
}
