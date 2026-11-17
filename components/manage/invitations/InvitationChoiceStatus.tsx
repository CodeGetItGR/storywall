'use client';

import { useTranslations } from 'next-intl';

import { InvitationPlanPrompt } from '@/components/manage/invitation/InvitationPlanPrompt';
import { InvitationStatusRow } from '@/components/manage/invitation/InvitationStatusRow';
import { AppLink } from '@/components/ui/AppLink';
import type { EventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';

// The invitation row's second line on Invitations & QR codes: where the invitation stands and what the host can do with it.
export function InvitationChoiceStatus({ invitation }: { invitation: EventOnlineInvitation }) {
    const t = useTranslations('ManagePage.invitation');
    const tEditor = useTranslations('InvitationEditor');

    // Loading
    if (invitation.isLoading) return <div className="h-8 w-40 animate-pulse rounded-full bg-surface-muted" />;

    // Error
    if (invitation.isError) {
        return (
            <p role="alert" className="text-sm text-rose-700">
                {tEditor('loadFailed')}
            </p>
        );
    }

    // Plan
    if (invitation.locked) return <InvitationPlanPrompt invitation={invitation} />;

    // Empty
    if (invitation.status === 'none') {
        return (
            <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-ink-muted">{t('empty')}</p>
                <AppLink
                    href={invitation.catalogueHref}
                    onClick={invitation.chooseTheme}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white"
                >
                    {t('chooseTheme')}
                </AppLink>
            </div>
        );
    }

    // Status and actions
    return <InvitationStatusRow invitation={invitation} />;
}
