'use client';

import { useTranslations } from 'next-intl';

import type { InvitationThemeStatus } from '@/lib/adminInvitationThemes';
import { cn } from '@/lib/utils';

const STATUS_PILL: Record<InvitationThemeStatus, string> = {
    DRAFT: 'bg-status-neutral-wash text-status-neutral',
    ACTIVE: 'bg-status-good-wash text-status-good',
    HIDDEN: 'bg-status-warn-wash text-status-warn',
};

export function InvitationThemeStatusPill({ status }: { status: InvitationThemeStatus }) {
    const t = useTranslations('AdminPage.invitationThemes.status');
    return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap', STATUS_PILL[status])}>{t(status)}</span>;
}
