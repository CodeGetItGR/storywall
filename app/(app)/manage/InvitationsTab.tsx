'use client';

import { Copy, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { useCreateEventInvitation, useDeleteEventInvitation, useUpdateEventInvitation } from '@/hooks/useEventInvitations';
import { getErrorMessage, getFieldErrors } from '@/lib/api/errors';
import type { EventInvitationPatchDto, EventInvitationRequestDto, EventInvitationResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export default function InvitationsTab({
    t,
    eventId,
    invitations,
}: {
    t: ReturnType<typeof useTranslations>;
    eventId: string;
    invitations: EventInvitationResponseDto[];
}) {
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="px-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-ink-muted">{t('invitationsCard.summary', { count: invitations.length })}</p>
                {!showCreate && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t('invitations.create.cta')}
                    </button>
                )}
            </div>

            {showCreate && <CreateInvitationForm t={t} eventId={eventId} onDone={() => setShowCreate(false)} />}

            <div className="flex flex-col divide-y divide-border">
                {invitations.map((invitation) => (
                    <InvitationRow key={invitation.id} t={t} eventId={eventId} invitation={invitation} />
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

            <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('invitations.fields.inviteCode')}</span>
                    <input
                        type="text"
                        required
                        maxLength={100}
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
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
                        onChange={(e) => setMaxGuests(Math.max(1, Number(e.target.value)))}
                        className="bg-surface-muted rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('invitations.fields.firstName')}</span>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="bg-surface-muted rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('invitations.fields.lastName')}</span>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="bg-surface-muted rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </label>
            </div>

            <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('invitations.fields.email')}</span>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
}: {
    t: ReturnType<typeof useTranslations>;
    eventId: string;
    invitation: EventInvitationResponseDto;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [copied, setCopied] = useState(false);
    const [maxGuests, setMaxGuests] = useState(invitation.maxGuests);

    const updateInvitation = useUpdateEventInvitation(invitation.id, eventId);
    const deleteInvitation = useDeleteEventInvitation(eventId);

    const guestName = [invitation.firstName, invitation.lastName].filter(Boolean).join(' ');
    const isUsed = Boolean(invitation.usedAt);
    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/invite/${invitation.inviteToken}` : '';

    async function handleCopy() {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    async function handleSaveEdit() {
        const patch: EventInvitationPatchDto = { maxGuests };
        await updateInvitation.mutateAsync(patch);
        setIsEditing(false);
    }

    async function handleDelete() {
        await deleteInvitation.mutateAsync(invitation.id);
    }

    return (
        <div className="py-4 flex flex-col gap-2 first:pt-0">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink truncate">{invitation.inviteCode}</p>
                        <span
                            className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
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

            {isEditing ? (
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-ink-muted">
                        {t('invitations.fields.maxGuests')}
                        <input
                            type="number"
                            min={1}
                            value={maxGuests}
                            onChange={(e) => setMaxGuests(Math.max(1, Number(e.target.value)))}
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
                        onClick={() => {
                            setIsEditing(false);
                            setMaxGuests(invitation.maxGuests);
                        }}
                        className="px-3 py-1.5 rounded-full bg-surface-muted text-ink-muted text-xs font-semibold hover:text-ink transition-colors"
                    >
                        {t('invitations.create.cancel')}
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <p className="text-xs text-ink-muted">{t('invitations.maxGuests', { count: invitation.maxGuests })}</p>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            {copied ? t('invitations.copied') : t('invitations.copyLink')}
                        </button>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            {t('invitations.edit')}
                        </button>
                        {confirmingDelete ? (
                            <button
                                onClick={handleDelete}
                                disabled={deleteInvitation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors disabled:opacity-40"
                            >
                                {deleteInvitation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('invitations.confirmRevoke')}
                            </button>
                        ) : (
                            <button
                                onClick={() => setConfirmingDelete(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t('invitations.revoke')}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
