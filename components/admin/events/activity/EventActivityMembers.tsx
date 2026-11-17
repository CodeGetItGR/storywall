'use client';

import { useTranslations } from 'next-intl';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { contributedShare } from '@/lib/adminEventActivity';
import type { AdminEventActivityDto } from '@/lib/api/types';

// How many members added anything, as one compact line.
export function EventActivityMembers({ members }: { members: AdminEventActivityDto['members'] }) {
    const t = useTranslations('AdminPage.events.activity');
    const format = useFunnelFormat();
    return (
        <p className="text-sm text-ink-muted">
            {t('members', {
                contributed: format.count(members.contributed),
                total: format.count(members.total),
                share: format.rate(contributedShare(members)),
            })}
        </p>
    );
}
