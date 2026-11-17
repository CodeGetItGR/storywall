'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ShareLanguageNote } from '@/components/manage/invitations/ShareLanguageNote';
import { useCoHostManagement } from '@/hooks/useCoHostManagement';
import type { MembersPageState } from '@/hooks/useMembersPage';

import { HostConfirmModals } from './HostConfirmModals';
import { HostRow } from './HostRow';
import { InviteCoHostSheet } from './InviteCoHostSheet';
import { PendingInvitationRow } from './PendingInvitationRow';

export function CurrentHostsSection({ page }: { page: MembersPageState }) {
    const t = useTranslations('ManagePage');
    const management = useCoHostManagement(page.eventId);

    return (
        <section aria-labelledby="current-hosts-title" className="flex flex-col gap-1">
            {/* Header */}
            <div className="flex items-center gap-2.5">
                <h2 id="current-hosts-title" className="flex-1 text-[17px] font-bold text-ink">
                    {t('invitations.coHosts.currentTitle')}
                </h2>
                {page.canInviteCoHost && (
                    <button
                        type="button"
                        onClick={page.openInvite}
                        className="flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold whitespace-nowrap text-white transition-opacity bg-gradient-brand hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t('invitations.coHosts.cta')}
                    </button>
                )}
            </div>

            {/* Read-only */}
            {!page.canWrite && (
                <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('invitations.readOnly')}</p>
            )}

            {/* Hosts and pending invitations */}
            <ul className="flex flex-col">
                {page.hostRows.map(({ host, member }) => (
                    <HostRow
                        key={host.id}
                        host={host}
                        member={member}
                        canManage={page.canManageHosts}
                        canTransfer={management.canTransfer}
                        onTransferAction={management.requestTransfer}
                        onRemoveAction={management.requestRemove}
                        onEditRoleAction={page.canManageRoles && member && !member.isFeatured ? page.roleSheet.open : undefined}
                    />
                ))}
                {page.pendingInvitations.map((invitation) => (
                    <PendingInvitationRow key={invitation.id} eventId={page.eventId} invitation={invitation} canWrite={page.canWrite} />
                ))}
            </ul>

            {/* Link language */}
            {page.pendingInvitations.length > 0 && <ShareLanguageNote className="mt-1" />}

            {/* Invite sheet */}
            <InviteCoHostSheet eventId={page.eventId} open={page.inviteOpen} onCloseAction={page.closeInvite} />

            {/* Transfer and remove confirmations */}
            <HostConfirmModals management={management} hostRows={page.hostRows} />
        </section>
    );
}
