'use client';

import { useTranslations } from 'next-intl';

import { OutreachReachRow } from '@/components/admin/outreach/OutreachReachRow';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { reachChannels } from '@/lib/adminOutreach';
import type { OutreachProspectDto } from '@/lib/api/types';

// Every way to reach them, each with open and copy.
export function OutreachReach({ prospect }: { prospect: OutreachProspectDto }) {
    const t = useTranslations('AdminPage.outreach.reach');
    const { copiedKey, copy } = useCopyFeedback();
    const channels = reachChannels(prospect);

    return (
        <section className="space-y-3">
            {/* Title */}
            <h3 className="text-sm font-bold text-ink">{t('title')}</h3>

            {channels.length === 0 && <p className="text-sm text-ink-muted">{t('none')}</p>}

            {/* Channels */}
            {channels.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {channels.map((channel) => (
                        <OutreachReachRow key={channel.key} channel={channel} copied={copiedKey === channel.key} onCopyAction={copy} />
                    ))}
                </ul>
            )}
        </section>
    );
}
