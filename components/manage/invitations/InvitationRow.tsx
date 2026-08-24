'use client';

import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDeleteEventInvitation, useUpdateEventInvitation } from '@/hooks/useEventInvitations';
import type { EventInvitationPatchDto, EventInvitationResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function InvitationRow({
    eventId,
    invitation,
    canWrite,
    onClampNoticeAction,
}: {
    eventId: string;
    invitation: EventInvitationResponseDto;
    canWrite: boolean;
    onClampNoticeAction?: (message: string) => void;
}) {
    const t = useTranslations('ManagePage');
    const [isEditing, setIsEditing] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [maxGuests, setMaxGuests] = useState(invitation.maxGuests);

    const updateInvitation = useUpdateEventInvitation(invitation.id, eventId);
    const deleteInvitation = useDeleteEventInvitation(eventId);

    const guestName = [invitation.firstName, invitation.lastName].filter(Boolean).join(' ');
    const isUsed = Boolean(invitation.usedAt);
    const isCoHost = invitation.role === 'HOST';
    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}${routes.inviteToken(invitation.inviteToken)}` : '';

    async function handleCopy() {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    async function handleSaveEdit() {
        if (!canWrite) return;
        const requestedMaxGuests = maxGuests;
        const patch: EventInvitationPatchDto = { maxGuests: requestedMaxGuests };
        const updated = await updateInvitation.mutateAsync(patch);
        if (updated.maxGuests !== requestedMaxGuests) {
            onClampNoticeAction?.(t('invitations.cappedToPlan', { count: updated.maxGuests }));
        }
        setMaxGuests(updated.maxGuests);
        setIsEditing(false);
    }

    async function handleDelete() {
        if (!canWrite) return;
        setDeleteConfirmOpen(false);
        await deleteInvitation.mutateAsync(invitation.id);
    }

    const onStopEditing = useCallback(() => {
        setIsEditing(false);
        setMaxGuests(invitation.maxGuests);
    }, [invitation.maxGuests]);

    const handleStartEditing = useCallback(() => {
        setMaxGuests(invitation.maxGuests);
        setIsEditing(true);
    }, [invitation.maxGuests]);

    const handleDeleteConfirmOpen = useCallback(() => {
        setDeleteConfirmOpen(true);
    }, []);

    const handleDeleteConfirmClose = useCallback(() => {
        setDeleteConfirmOpen(false);
    }, []);

    function handleMaxGuestsChange(event: ChangeEvent<HTMLInputElement>) {
        setMaxGuests(Math.max(1, Number(event.target.value)));
    }

    return (
        <div className="flex flex-col gap-2 py-4 first:pt-0">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{invitation.inviteCode}</p>
                        <span
                            className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                isUsed ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-muted text-ink-muted'
                            )}
                        >
                            {isUsed ? t('invitations.claimed') : t('invitations.unclaimed')}
                        </span>
                    </div>
                    {(guestName || invitation.email) && (
                        <p className="mt-0.5 truncate text-xs text-ink-muted">{[guestName, invitation.email].filter(Boolean).join(' · ')}</p>
                    )}
                </div>
            </div>

            {isEditing && canWrite && !isCoHost ? (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-ink-muted">
                        {t('invitations.fields.maxGuests')}
                        <input
                            type="number"
                            min={1}
                            value={maxGuests}
                            onChange={handleMaxGuestsChange}
                            className="w-16 rounded-lg bg-surface-muted px-2 py-1 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary/30"
                        />
                    </label>
                    <button
                        onClick={handleSaveEdit}
                        disabled={updateInvitation.isPending}
                        className="ml-auto rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                        {t('invitations.save')}
                    </button>
                    <button
                        onClick={onStopEditing}
                        className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                    >
                        {t('invitations.create.cancel')}
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-ink-muted">
                        {isCoHost ? t('invitations.coHosts.singleRecipient') : t('invitations.maxGuests', { count: invitation.maxGuests })}
                    </p>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                            <Copy className="h-3.5 w-3.5" />
                            {copied ? t('invitations.copied') : t('invitations.copyLink')}
                        </button>
                        {canWrite && (
                            <>
                                {!isCoHost && (
                                    <button
                                        onClick={handleStartEditing}
                                        className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        {t('invitations.edit')}
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteConfirmOpen}
                                    className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {t('invitations.revoke')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

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
