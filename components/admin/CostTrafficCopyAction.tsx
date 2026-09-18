'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

export function CostTrafficCopyAction({ eventId }: { eventId: string }) {
    const t = useTranslations('AdminPage.costTracking');
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(eventId);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }, [eventId]);

    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? t('traffic.copiedEventId') : t('traffic.copyEventId')}
            title={copied ? t('traffic.copiedEventId') : t('traffic.copyEventId')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            {copied ? <Check className="h-4 w-4 text-status-good" /> : <Copy className="h-4 w-4" />}
        </button>
    );
}
