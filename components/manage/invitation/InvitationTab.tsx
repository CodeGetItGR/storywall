'use client';

import { MailOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { InvitationPlanPrompt } from '@/components/manage/invitation/InvitationPlanPrompt';
import { InvitationShareLink } from '@/components/manage/invitation/InvitationShareLink';
import { InvitationStatusRow } from '@/components/manage/invitation/InvitationStatusRow';
import { AppLink } from '@/components/ui/AppLink';
import { LoadingState } from '@/components/ui/LoadingState';
import type { EventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';

// Manage → Invitation: the event's online invitation, a way to start one from a theme, or the upgrade when the plan lacks it.
export function InvitationTab({ invitation }: { invitation: EventOnlineInvitation }) {
    const t = useTranslations('ManagePage.invitation');
    const tEditor = useTranslations('InvitationEditor');

    if (invitation.isLoading) return <LoadingState className="py-10" />;

    if (invitation.isError) {
        return (
            <p role="alert" className="py-6 text-sm font-medium text-rose-700">
                {tEditor('loadFailed')}
            </p>
        );
    }

    // Plan
    if (invitation.locked) return <InvitationPlanPrompt invitation={invitation} />;

    if (invitation.status === 'none') {
        return (
            // Empty
            <div className="flex flex-col items-center gap-4 py-10 text-center">
                <MailOpen className="h-8 w-8 text-ink-faint" aria-hidden="true" />
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

    return (
        <div className="flex flex-col gap-6">
            {/* Status */}
            <InvitationStatusRow invitation={invitation} />

            {/* Link */}
            {invitation.publicUrl && invitation.status === 'live' && <InvitationShareLink url={invitation.publicUrl} />}
        </div>
    );
}
