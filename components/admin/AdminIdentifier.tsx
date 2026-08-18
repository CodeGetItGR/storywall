'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';

// An admin can only act on an id the console itself hands them: there is no
// database console behind this UI. Wherever a row knows an id another panel
// needs, it is rendered with this so it can be copied rather than transcribed.
export function AdminIdentifier({ label, value, className }: { label: string; value: string; className?: string }) {
    const t = useTranslations('AdminPage');
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [value]);

    return (
        <div className={cn('min-w-0', className)}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{label}</p>
            <div className="flex items-center gap-1.5">
                <code className="min-w-0 truncate font-mono text-xs text-ink-muted" title={value}>
                    {value}
                </code>
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={copied ? t('identifiers.copied') : t('identifiers.copy', { label })}
                    title={copied ? t('identifiers.copied') : t('identifiers.copy', { label })}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-faint transition hover:bg-surface-muted hover:text-ink"
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-status-good" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
            </div>
        </div>
    );
}
