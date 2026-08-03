'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function RsvpHeader({ onGoBack }: { onGoBack: () => void }) {
    const t = useTranslations('RSVPPage');

    return (
        <div className="flex items-center gap-3 py-4 mb-2">
            <button
                onClick={onGoBack}
                aria-label={t('goBack')}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-ink">{t('title')}</h1>
        </div>
    );
}
