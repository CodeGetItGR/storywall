'use client';

import { Copy, Mail, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type RowAction, RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { useCopyText } from '@/hooks/useCopyText';
import { useDeleteEventInvitation } from '@/hooks/useEventInvitations';
import { useShareLink } from '@/hooks/useShareLink';
import type { EventInvitationResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { invitationExpiry } from '@/lib/eventInvitations';
import { routes } from '@/lib/routes';

type PendingInvitationRowProps = {
    eventId: string;
    invitation: EventInvitationResponseDto;
    canWrite: boolean;
};

export function PendingInvitationRow({ eventId, invitation, canWrite }: PendingInvitationRowProps) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const [revokeOpen, setRevokeOpen] = useState(false);
    const deleteInvitation = useDeleteEventInvitation(eventId);
    const inviteLink = useShareLink(typeof window !== 'undefined' ? `${window.location.origin}${routes.inviteToken(invitation.inviteToken)}` : '');
    const { copied, copy } = useCopyText(inviteLink);

    const title = invitation.email ?? invitation.inviteCode;
    const details = useMemo(() => {
        const recipientName = [invitation.firstName, invitation.lastName].filter(Boolean).join(' ');
        const expiry = invitationExpiry(invitation);
        const expiryLabel = !expiry
            ? null
            : expiry.kind === 'expires'
              ? t('invitations.coHosts.expiresOn', { date: formatDate(locale, expiry.at, { dateStyle: 'medium' }) })
              : t('qr.status.EXPIRED');
        return [recipientName, expiryLabel].filter(Boolean).join(' · ');
    }, [invitation, locale, t]);

    const openRevoke = useCallback(() => setRevokeOpen(true), []);
    const closeRevoke = useCallback(() => setRevokeOpen(false), []);
    const confirmRevoke = useCallback(async () => {
        if (!canWrite) return;
        setRevokeOpen(false);
        await deleteInvitation.mutateAsync(invitation.id);
    }, [canWrite, deleteInvitation, invitation.id]);

    const actions = useMemo<RowAction[]>(
        () => [
            { key: 'copy', label: copied ? t('invitations.copied') : t('invitations.copyLink'), icon: Copy, onSelect: copy, keepOpen: true },
            ...(canWrite ? [{ key: 'revoke', label: t('invitations.revoke'), icon: Trash2, tone: 'danger' as const, onSelect: openRevoke }] : []),
        ],
        [canWrite, copied, copy, openRevoke, t],
    );

    return (
        <li className="flex min-h-[60px] items-center gap-3">
            {/* Placeholder avatar */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-border text-ink-faint">
                <Mail className="h-4 w-4" aria-hidden="true" />
            </span>

            {/* Summary */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">{title}</p>
                {details && <p className="mt-0.5 truncate text-[13px] text-ink-muted">{details}</p>}
            </div>

            {/* Actions */}
            <RowActionsMenu label={t('members.moreFor', { name: title })} items={actions} />

            {/* Revoke confirmation */}
            <ConfirmActionModal
                open={revokeOpen}
                onCloseAction={closeRevoke}
                onConfirmAction={confirmRevoke}
                title={t('invitations.revokeConfirmTitle')}
                body={t('invitations.revokeConfirmBody')}
                confirmLabel={t('invitations.confirmRevoke')}
                cancelLabel={t('invitations.create.cancel')}
                isConfirming={deleteInvitation.isPending}
            />
        </li>
    );
}
