'use client';

import { Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateCoHostInvitation } from '@/hooks/useEventInvitations';
import { getFieldErrors } from '@/lib/api/errors';

import { fieldControlClass, fieldLabelClass, fieldTextClass, formPanelClass } from './shared';

export function CreateCoHostInvitationForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
    const t = useTranslations('ManagePage.invitations.coHosts');
    const create = useCreateCoHostInvitation(eventId);
    const toErrorMessage = useApiErrorMessage();
    const errors = getFieldErrors(create.error);

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
            await create.mutateAsync({
                email: String(data.get('email') ?? '').trim(),
                firstName: String(data.get('firstName') ?? '').trim() || undefined,
                lastName: String(data.get('lastName') ?? '').trim() || undefined,
                expiresAt: String(data.get('expiresAt') ?? '') || undefined,
            });
            onDone();
        } catch {
            /* surfaced below */
        }
    }

    return (
        <form onSubmit={submit} className={formPanelClass}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-ink">{t('title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={onDone}
                    aria-label={t('cancel')}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <FormFieldLabel label={t('email')} required className={fieldLabelClass} labelClassName={fieldTextClass}>
                    <input name="email" type="email" required maxLength={255} className={fieldControlClass} />
                    {errors?.email && <span className="text-xs text-rose-600">{errors.email}</span>}
                </FormFieldLabel>
                <FormFieldLabel label={t('expiresAt')} optional className={fieldLabelClass} labelClassName={fieldTextClass}>
                    <input name="expiresAt" type="datetime-local" className={fieldControlClass} />
                </FormFieldLabel>
                <FormFieldLabel label={t('firstName')} optional className={fieldLabelClass} labelClassName={fieldTextClass}>
                    <input name="firstName" maxLength={100} className={fieldControlClass} />
                </FormFieldLabel>
                <FormFieldLabel label={t('lastName')} optional className={fieldLabelClass} labelClassName={fieldTextClass}>
                    <input name="lastName" maxLength={100} className={fieldControlClass} />
                </FormFieldLabel>
            </div>
            <p className="mt-3 text-xs text-ink-muted">{t('emailNotice')}</p>
            {create.error && !errors && <p className="mt-3 text-xs text-rose-600">{toErrorMessage(create.error)}</p>}
            <button
                type="submit"
                disabled={create.isPending}
                className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-gradient-brand px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('submit')}
            </button>
        </form>
    );
}
