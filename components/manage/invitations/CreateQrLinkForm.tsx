'use client';

import { Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useState } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useCreateQrLink } from '@/hooks/useQrLinks';
import type { QrLinkRequestDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { fieldControlClass, fieldLabelClass, fieldTextClass, formPanelClass } from './shared';

export function CreateQrLinkForm({
    eventId,
    onDoneAction,
}: {
    eventId: string;
    onDoneAction: () => void;
}) {
    const t = useTranslations('ManagePage');
    const createQrLink = useCreateQrLink(eventId);
    const { data: invitations = [] } = useEventInvitations(eventId);
    const [label, setLabel] = useState('');
    const [invitationId, setInvitationId] = useState('');
    const toErrorMessage = useApiErrorMessage();

    function handleLabelChange(event: ChangeEvent<HTMLInputElement>) {
        setLabel(event.target.value);
    }

    function handleInvitationChange(event: ChangeEvent<HTMLSelectElement>) {
        setInvitationId(event.target.value);
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const input: QrLinkRequestDto = {
            targetType: 'INVITATION',
            label: label.trim() || undefined,
            targetId: invitationId,
        };

        try {
            await createQrLink.mutateAsync(input);
            onDoneAction();
        } catch {
            // error surfaced inline below
        }
    }

    return (
        <form onSubmit={handleSubmit} className={formPanelClass}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-ink">{t('qr.create.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('qr.create.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={onDoneAction}
                    aria-label={t('invitations.create.cancel')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Invitation details */}
            <div className="grid gap-3 sm:grid-cols-2">
                <FormFieldLabel label={t('qr.fields.label')} optional className={fieldLabelClass} labelClassName={fieldTextClass}>
                    <input
                        type="text"
                        maxLength={100}
                        value={label}
                        onChange={handleLabelChange}
                        placeholder={t('qr.placeholders.label')}
                        className={cn(fieldControlClass, 'placeholder:text-ink-faint')}
                    />
                </FormFieldLabel>
                <FormFieldLabel label={t('qr.fields.invitation')} required className={fieldLabelClass} labelClassName={fieldTextClass}>
                    <select required value={invitationId} onChange={handleInvitationChange} className={fieldControlClass}>
                        <option value="">{t('qr.placeholders.invitation')}</option>
                        {invitations.map((invitation) => (
                            <option key={invitation.id} value={invitation.id}>
                                {invitation.firstName || invitation.lastName
                                    ? [invitation.firstName, invitation.lastName].filter(Boolean).join(' ')
                                    : invitation.email || invitation.inviteCode}
                            </option>
                        ))}
                    </select>
                </FormFieldLabel>
            </div>

            {createQrLink.isError && <p className="mt-3 text-xs text-rose-500">{toErrorMessage(createQrLink.error)}</p>}

            <button
                type="submit"
                disabled={createQrLink.isPending}
                className="mt-4 ml-auto flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-2 px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {createQrLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('qr.create.submit')}
            </button>
        </form>
    );
}
