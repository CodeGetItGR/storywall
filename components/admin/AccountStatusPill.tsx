import { useTranslations } from 'next-intl';

import type { AccountStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<AccountStatus, string> = {
    ACTIVE: 'bg-status-good-wash text-status-good',
    SUSPENDED: 'bg-status-warn-wash text-status-warn',
    DELETED: 'bg-status-neutral-wash text-status-neutral',
};

export function AccountStatusPill({ status }: { status: AccountStatus }) {
    const t = useTranslations('AdminPage.accounts.status');
    return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS_STYLES[status])}>{t(status)}</span>;
}
