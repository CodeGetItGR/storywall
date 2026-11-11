'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { EventOnlineInvitation, OnlineInvitationStatus } from '@/hooks/useEventOnlineInvitation';
import { cn } from '@/lib/utils';

const STATUS_TONE: Record<Exclude<OnlineInvitationStatus, 'none'>, string> = {
    draft: 'bg-surface-muted text-ink-muted',
    live: 'bg-primary-light text-primary-dark',
    offline: 'bg-amber-50 text-amber-700',
};

const ACTION_CLASS =
    'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-surface-muted px-4 text-xs font-semibold text-ink transition-colors hover:bg-border/60';

// Where the invitation stands, with Edit, and Extend while its time online runs out or ran out.
export function InvitationStatusRow({ invitation }: { invitation: EventOnlineInvitation }) {
    const t = useTranslations('ManagePage.invitation');
    const tEditor = useTranslations('InvitationEditor');
    const { status } = invitation;
    if (status === 'none') return null;

    const label =
        status === 'draft'
            ? t('notPublished')
            : status === 'offline'
              ? t('offline')
              : invitation.liveUntil
                ? t('liveUntil', { date: invitation.liveUntil })
                : t('live');

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Status */}
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', STATUS_TONE[status])}>{label}</span>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                    {invitation.canExtend && (
                        <AppLink href={invitation.planHref} className={ACTION_CLASS}>
                            {t('extend')}
                        </AppLink>
                    )}
                    {invitation.editHref && (
                        <AppLink href={invitation.editHref} className={cn(ACTION_CLASS, 'bg-ink text-white hover:bg-ink/90')}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('edit')}
                        </AppLink>
                    )}
                </div>
            </div>

            {/* Plan */}
            {invitation.planMissing && (
                <p className="text-sm text-ink-muted">
                    {tEditor('planMissingTitle')}{' '}
                    <AppLink href={invitation.planHref} className="font-semibold text-primary-dark underline underline-offset-2">
                        {tEditor('seePlan')}
                    </AppLink>
                </p>
            )}
        </div>
    );
}
