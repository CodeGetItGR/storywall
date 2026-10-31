'use client';

import { useTranslations } from 'next-intl';

import { OUTREACH_STATUS_TONE, type OutreachStatusSegment } from '@/lib/adminOutreach';
import { cn } from '@/lib/utils';

// One bar split by status. Each segment names its status and count on hover.
export function OutreachStackedBar({ segments, label }: { segments: OutreachStatusSegment[]; label: string }) {
    const t = useTranslations('AdminPage.outreach.status');

    return (
        <div role="img" aria-label={label} className="flex h-3 overflow-hidden rounded-full bg-surface-muted">
            {segments.map((segment) => (
                <div
                    key={segment.status}
                    title={`${t(segment.status)}: ${segment.count}`}
                    className={cn('h-full border-r border-card last:border-r-0', OUTREACH_STATUS_TONE[segment.status].bar)}
                    style={{ width: `${segment.share * 100}%` }}
                />
            ))}
        </div>
    );
}
