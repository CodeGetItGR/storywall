import { useTranslations } from 'next-intl';

import { auditActionTone,type AuditTone } from '@/lib/adminAuditLog';
import type { AdminAuditAction } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONE_STYLES: Record<AuditTone, string> = {
    good: 'bg-status-good-wash text-status-good',
    warn: 'bg-status-warn-wash text-status-warn',
    danger: 'bg-status-danger-wash text-status-danger',
    neutral: 'bg-status-neutral-wash text-status-neutral',
};

export function AuditActionPill({ action }: { action: AdminAuditAction }) {
    const t = useTranslations('AdminPage.auditLog.actions');
    return (
        <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap', TONE_STYLES[auditActionTone(action)])}>
            {t.has(action) ? t(action) : action}
        </span>
    );
}
