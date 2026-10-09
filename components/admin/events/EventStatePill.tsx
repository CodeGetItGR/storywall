import { useTranslations } from 'next-intl';

import type { AdminEventState } from '@/lib/adminEvents';
import { cn } from '@/lib/utils';

const STATE_STYLES: Record<AdminEventState, string> = {
    ACTIVE: 'bg-status-good-wash text-status-good',
    DRAFT: 'bg-status-neutral-wash text-status-neutral',
    SUSPENDED: 'bg-status-warn-wash text-status-warn',
    CLOSED: 'bg-status-danger-wash text-status-danger',
    DELETED: 'bg-status-neutral-wash text-status-neutral',
};

export function EventStatePill({ state }: { state: AdminEventState }) {
    const t = useTranslations('AdminPage.events.state');
    return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', STATE_STYLES[state])}>{t(state)}</span>;
}
