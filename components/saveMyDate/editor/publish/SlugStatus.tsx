'use client';

import { Check, LoaderCircle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SlugCheck } from '@/lib/invitation/publication';
import { cn } from '@/lib/utils';

type SlugStatusProps = { id: string; check: SlugCheck };

type StatusLine = { key: 'slugChecking' | 'slugAvailable' | 'slugTaken' | 'slugReserved' | 'slugInvalid'; tone: 'ok' | 'bad' | 'wait' };

function statusLine(check: SlugCheck): StatusLine | null {
    switch (check) {
        case 'checking':
            return { key: 'slugChecking', tone: 'wait' };
        case 'available':
            return { key: 'slugAvailable', tone: 'ok' };
        case 'taken':
            return { key: 'slugTaken', tone: 'bad' };
        case 'reserved':
            return { key: 'slugReserved', tone: 'bad' };
        case 'invalid':
            return { key: 'slugInvalid', tone: 'bad' };
        case 'empty':
        case 'unknown':
            return null;
    }
}

// The line under the link field: checking, free, or why it can't be used.
export function SlugStatus({ id, check }: SlugStatusProps) {
    const t = useTranslations('InvitationEditor');
    const line = statusLine(check);

    return (
        <p
            id={id}
            aria-live="polite"
            className={cn(
                'flex min-h-5 items-center gap-1.5 text-sm',
                line?.tone === 'ok' && 'text-emerald-700',
                line?.tone === 'bad' && 'text-rose-700',
                line?.tone === 'wait' && 'text-ink-muted',
            )}
        >
            {line && (
                <>
                    {line.tone === 'ok' && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    {line.tone === 'bad' && <X className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    {line.tone === 'wait' && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {t(line.key)}
                </>
            )}
        </p>
    );
}
