import { useTranslations } from 'next-intl';

import type { CollaborationCodeStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const CODE_STATUS_PILL: Record<CollaborationCodeStatus, string> = {
    ACTIVE: 'bg-status-good-wash text-status-good',
    DISABLED: 'bg-status-neutral-wash text-status-neutral',
};

export function AdminCodeStatusPill({ status }: { status: CollaborationCodeStatus }) {
    const t = useTranslations('AdminPage.collaborations.codes.status');

    return <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-bold', CODE_STATUS_PILL[status])}>{t(status)}</span>;
}
