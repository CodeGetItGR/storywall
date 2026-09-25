'use client';

import { Copy, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCopyText } from '@/hooks/useCopyText';
import { useDeleteEventInvitation } from '@/hooks/useEventInvitations';
import { useShareLink } from '@/hooks/useShareLink';
import type { EventInvitationResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function CoHostInvitationRow({
    eventId,
    invitation,
    canWrite,
}: {
    eventId: string;
    invitation: EventInvitationResponseDto;
    canWrite: boolean;
}) {
    const t = useTranslations('ManagePage');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const deleteInvitation = useDeleteEventInvitation(eventId);

    const recipientName = [invitation.firstName, invitation.lastName].filter(Boolean).join(' ');
    const isUsed = Boolean(invitation.usedAt);
    const inviteLink = useShareLink(typeof window !== 'undefined' ? `${window.location.origin}${routes.inviteToken(invitation.inviteToken)}` : '');
    const { copied, copy: handleCopy } = useCopyText(inviteLink);

    async function handleDelete() {
        if (!canWrite) return;
        setDeleteConfirmOpen(false);
        await deleteInvitation.mutateAsync(invitation.id);
    }

    const handleDeleteConfirmOpen = useCallback(() => {
        setDeleteConfirmOpen(true);
    }, []);

    const handleDeleteConfirmClose = useCallback(() => {
        setDeleteConfirmOpen(false);
    }, []);

    return (
        <div className="flex flex-col gap-2 py-4 first:pt-0">
            {/* Summary */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{invitation.inviteCode}</p>
                        <span
                            className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                isUsed ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-muted text-ink-muted',
                            )}
                        >
                            {isUsed ? t('invitations.claimed') : t('invitations.unclaimed')}
                        </span>
                    </div>
                    {(recipientName || invitation.email) && (
                        <p className="mt-0.5 truncate text-xs text-ink-muted">{[recipientName, invitation.email].filter(Boolean).join(' · ')}</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-ink-muted">{t('invitations.coHosts.singleRecipient')}</p>
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? t('invitations.copied') : t('invitations.copyLink')}
                    </button>
                    {canWrite && (
                        <button
                            onClick={handleDeleteConfirmOpen}
                            className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('invitations.revoke')}
                        </button>
                    )}
                </div>
            </div>

            {/* Revoke confirmation */}
            <ConfirmActionModal
                open={deleteConfirmOpen}
                onCloseAction={handleDeleteConfirmClose}
                onConfirmAction={handleDelete}
                title={t('invitations.revokeConfirmTitle')}
                body={t('invitations.revokeConfirmBody')}
                confirmLabel={t('invitations.confirmRevoke')}
                cancelLabel={t('invitations.create.cancel')}
                isConfirming={deleteInvitation.isPending}
            />
        </div>
    );
}
