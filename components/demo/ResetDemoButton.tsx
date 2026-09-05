'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { demoDb } from '@/lib/demo/mockHandlers';

export function ResetDemoButton() {
    const t = useTranslations('Demo');

    function handleReset() {
        demoDb.reset();
        window.location.reload();
    }

    return (
        <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-muted"
        >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t('resetDemo')}
        </button>
    );
}
