'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export function OutreachCopyButton({
    label,
    copied,
    onCopyAction,
    disabled = false,
    tone = 'quiet',
}: {
    label: string;
    copied: boolean;
    onCopyAction: () => void;
    disabled?: boolean;
    tone?: 'quiet' | 'strong';
}) {
    const t = useTranslations('AdminPage.outreach');

    return (
        <button
            type="button"
            onClick={onCopyAction}
            disabled={disabled}
            className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors disabled:opacity-40',
                tone === 'strong' ? 'bg-ink text-white' : 'border border-border bg-card text-ink-muted hover:text-ink',
            )}
        >
            {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
            {copied ? t('copied') : label}
        </button>
    );
}
