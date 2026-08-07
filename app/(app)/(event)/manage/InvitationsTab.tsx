'use client';

import { Copy, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import React, {useCallback, useState} from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCreateEventInvitation, useDeleteEventInvitation, useUpdateEventInvitation } from '@/hooks/useEventInvitations';
import { getErrorMessage, getFieldErrors } from '@/lib/api/errors';
import type { EventInvitationPatchDto, EventInvitationRequestDto, EventInvitationResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export default function InvitationsTab({
    t,
    eventId,
    invitations,
    canWrite,
}: {
    t: ReturnType<typeof useTranslations>;
    eventId: string;
    invitations: EventInvitationResponseDto[];
    canWrite: boolean;
}) {
    const [showCreate, setShowCreate] = useState(false);

    const handleShowCreate = useCallback(() => {
        if (!canWrite) return;
        setShowCreate(true);
    }, [canWrite]);

    const handleHideCreate = useCallback(() => {
        setShowCreate(false);
    }, []);

    return (
        <div className="px-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-ink-muted">{t('invitationsCard.summary', { count: invitations.length })}</p>
                {!showCreate && canWrite && (
                    <button
                        onClick={handleShowCreate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t('invitations.create.cta')}
                    </button>
                )}
            </div>

            {!canWrite && <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('invitations.readOnly')}</p>}

            {showCreate && canWrite && <CreateInvitationForm t={t} eventId={eventId} onDone={handleHideCreate} />}

            <div className="flex flex-col divide-y divide-border">
                {invitations.map((invitation) => (
                    <InvitationRow key={invitation.id} t={t} eventId={eventId} invitation={invitation} canWrite={canWrite} />
                ))}
            </div>

            {invitations.length === 0 && !showCreate && <p className="text-sm text-ink-muted text-center py-10">{t('invitations.empty')}</p>}
        </div>
    );
}

function CreateInvitationForm({ t, eventId, onDone }: { t: ReturnType<typeof useTranslations>; eventId: string; onDone: () => void }) {
    const createInvitation = useCreateEventInvitation();
    const [inviteCode, setInviteCode] = useState('');
    const [maxGuests, setMaxGuests] = useState(1);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    const fieldErrors = getFieldErrors(createInvitation.error);

    function handleInviteCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setInviteCode(e.target.value);
    }

    function handleMaxGuestsChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMaxGuests(Math.max(1, Number(e.target.value)));
    }

    function handleFirstNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFirstName(e.target.value);
    }

    function handleLastNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLastName(e.target.value);
    }

    function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
        setEmail(e.target.value);
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const input: EventInvitationRequestDto = {
            eventId,
            inviteCode: inviteCode.trim(),
            maxGuests,
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            email: email.trim() || undefined,
        };
        try {
            await createInvitation.mutateAsync(input);
            onDone();
        } catch {
            // error surfaced inline below
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-4 border-y border-border mb-1">
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">{t('invitations.create.title')}</p>
                <button
                    type="button"
                    onClick={onDone}
                    aria-label={t('invitations.create.cancel')}
                    className="text-ink-muted hover:text-ink transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('invitations.fields.inviteCode')}</span>
                    <input
                        type="text"
                        required
                        maxLength={100}
                        value={inviteCode}
                        onChange={handleInviteCodeChange}
                        placeholder={t('invitations.placeholders.inviteCode')}
                        className="bg-surface-muted rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                    {fieldErrors?.inviteCode && <span className="text-xs text-rose-500">{fieldErrors.inviteCode}</span>}
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('invitations.fields.maxGuests')}</span>
                    <input
                        type="number"
                        required
                        min={1}
                        value={maxGuests}
                        onChange={handleMaxGuestsChange}
                        className="bg-surface-muted rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('invitations.fields.firstName')}</span>
                    <input
                        type="text"
                        value={firstName}
                        onChange={handleFirstNameChange}
                        className="bg-surface-muted rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('invitations.fields.lastName')}</span>
                    <input
                        type="text"
                        value={lastName}
                        onChange={handleLastNameChange}
                        className="bg-surface-muted rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </label>
            </div>

            <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('invitations.fields.email')}</span>
                <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    className="bg-surface-muted rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
                {fieldErrors?.email && <span className="text-xs text-rose-500">{fieldErrors.email}</span>}
            </label>

            {createInvitation.isError && !fieldErrors && <p className="text-xs text-rose-500">{getErrorMessage(createInvitation.error)}</p>}

            <button
                type="submit"
                disabled={createInvitation.isPending || !inviteCode.trim()}
                className="flex items-center justify-center gap-2 py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {createInvitation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('invitations.create.submit')}
            </button>
        </form>
    );
}

function InvitationRow({
    t,
    eventId,
    invitation,
    canWrite,
}: {
    t: ReturnType<typeof useTranslations>;
    eventId: string;
    invitation: EventInvitationResponseDto;
    canWrite: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [maxGuests, setMaxGuests] = useState(invitation.maxGuests);

    const updateInvitation = useUpdateEventInvitation(invitation.id, eventId);
    const deleteInvitation = useDeleteEventInvitation(eventId);

    const guestName = [invitation.firstName, invitation.lastName].filter(Boolean).join(' ');
    const isUsed = Boolean(invitation.usedAt);
    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}${routes.inviteToken(invitation.inviteToken)}` : '';

    async function handleCopy() {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    async function handleSaveEdit() {
        if (!canWrite) return;
        const patch: EventInvitationPatchDto = { maxGuests };
        await updateInvitation.mutateAsync(patch);
        setIsEditing(false);
    }

    async function handleDelete() {
        if (!canWrite) return;
        setDeleteConfirmOpen(false);
        await deleteInvitation.mutateAsync(invitation.id);
    }

    const onMaxGuestsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setMaxGuests(Math.max(1, Number(e.target.value)))
    },[])

    const onStopEditing = useCallback(() => {
        setIsEditing(false);
        setMaxGuests(invitation.maxGuests);
    },[invitation.maxGuests])

    const onStartEditing = useCallback(() => {
        if (!canWrite) return;
        setIsEditing(true);
    },[canWrite])

    const onConfirmDelete = useCallback(() => {
        if (!canWrite) return;
        setDeleteConfirmOpen(true)
    }, [canWrite])

    const onCloseDeleteConfirm = useCallback(() => {
        setDeleteConfirmOpen(false);
    }, [])

    return (
        <div className="py-4 flex flex-col gap-2 first:pt-0">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink truncate">{invitation.inviteCode}</p>
                        <span
                            className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                                isUsed ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-muted text-ink-muted'
                            )}
                        >
                            {isUsed ? t('invitations.claimed') : t('invitations.unclaimed')}
                        </span>
                    </div>
                    {(guestName || invitation.email) && (
                        <p className="text-xs text-ink-muted mt-0.5 truncate">{[guestName, invitation.email].filter(Boolean).join(' · ')}</p>
                    )}
                </div>
            </div>

            {isEditing && canWrite ? (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-ink-muted">
                        {t('invitations.fields.maxGuests')}
                        <input
                            type="number"
                            min={1}
                            value={maxGuests}
                            onChange={onMaxGuestsChange}
                            className="w-16 bg-surface-muted rounded-lg px-2 py-1 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                        />
                    </label>
                    <button
                        onClick={handleSaveEdit}
                        disabled={updateInvitation.isPending}
                        className="ml-auto px-3 py-1.5 rounded-full bg-gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                        {t('invitations.save')}
                    </button>
                    <button
                        onClick={onStopEditing}
                        className="px-3 py-1.5 rounded-full bg-surface-muted text-ink-muted text-xs font-semibold hover:text-ink transition-colors"
                    >
                        {t('invitations.create.cancel')}
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-ink-muted">{t('invitations.maxGuests', { count: invitation.maxGuests })}</p>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            {copied ? t('invitations.copied') : t('invitations.copyLink')}
                        </button>
                        {canWrite && (
                            <>
                                <button
                                    onClick={onStartEditing}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {t('invitations.edit')}
                                </button>
                                <button
                                    onClick={onConfirmDelete}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-rose-500 hover:bg-rose-50 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {t('invitations.revoke')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <ConfirmActionModal
                open={deleteConfirmOpen}
                onClose={onCloseDeleteConfirm}
                onConfirm={handleDelete}
                title={t('invitations.revokeConfirmTitle')}
                body={t('invitations.revokeConfirmBody')}
                confirmLabel={t('invitations.confirmRevoke')}
                cancelLabel={t('invitations.create.cancel')}
                isConfirming={deleteInvitation.isPending}
            />
        </div>
    );
}
