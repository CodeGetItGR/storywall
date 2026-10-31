'use client';

import { useTranslations } from 'next-intl';

import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import { EMPTY_VALUE } from '@/lib/adminFunnel';
import { isActiveOutreachStatus } from '@/lib/adminOutreach';
import type { OutreachProspectRowDto } from '@/lib/api/types';

// What happens next: send the first email, or follow up on a date.
export function OutreachNextStepCell({ row }: { row: OutreachProspectRowDto }) {
    const t = useTranslations('AdminPage.outreach.table');
    const format = useOutreachFormat();

    if (row.status === 'NEW') return <span className="text-ink-muted">{t('sendEmail')}</span>;
    if (!isActiveOutreachStatus(row.status) || !row.nextFollowupOn) return <span className="text-ink-faint">{EMPTY_VALUE}</span>;
    if (row.followupDue) {
        return <span className="font-bold text-status-warn">{t('followUpDue', { date: format.day(row.nextFollowupOn) })}</span>;
    }
    return <span className="text-ink-muted">{t('followUpOn', { date: format.day(row.nextFollowupOn) })}</span>;
}
