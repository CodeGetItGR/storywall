'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { InvitationThemeSegmented } from '@/components/admin/saveMyDate/themes/InvitationThemeSegmented';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useInvitationTextDrawer } from '@/hooks/useInvitationTextDrawer';
import type { EventTypeOption } from '@/hooks/useInvitationThemesCatalog';
import {
    type AdminInvitationTextDto,
    INVITATION_TEXT_BODY_MAX,
    INVITATION_TEXT_LABEL_MAX,
    INVITATION_TEXT_LANGUAGES,
    type InvitationTextLanguage,
} from '@/lib/adminInvitationTexts';

const FORM_ID = 'invitation-text-form';

export function InvitationTextDrawer({
    text,
    eventTypes,
    onCloseAction,
}: {
    text: AdminInvitationTextDto | null;
    eventTypes: EventTypeOption[];
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.saveMyDate.texts');
    const tChecks = useTranslations('AdminPage.saveMyDate.checks');
    const tDrawer = useTranslations('AdminPage.invitationThemes.drawer');
    const tLanguages = useTranslations('AdminPage.partnerApplications.languages');
    const tFields = useTranslations('AdminPage.partnerApplications.fields');
    const apiErrorMessage = useApiErrorMessage();
    const form = useInvitationTextDrawer({ text, eventTypes, onDoneAction: onCloseAction });
    const languageOptions: { value: InvitationTextLanguage; label: string }[] = INVITATION_TEXT_LANGUAGES.map((language) => ({
        value: language,
        label: tLanguages(language),
    }));
    const busy = form.isSaving || form.isDeleting;

    const footer = (
        <div className="flex w-full items-center justify-between gap-2">
            {/* Delete */}
            {!form.isCreate ? (
                <button
                    type="button"
                    onClick={form.openDelete}
                    disabled={busy}
                    className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-status-danger hover:bg-status-danger/10 disabled:opacity-50"
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('delete')}
                </button>
            ) : (
                <span />
            )}

            {/* Save */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCloseAction}
                    disabled={busy}
                    className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
                >
                    {tDrawer('cancel')}
                </button>
                <button
                    type="submit"
                    form={FORM_ID}
                    disabled={busy}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                    {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {tDrawer('save')}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <AdminDrawer
                open
                onClose={onCloseAction}
                closeDisabled={busy}
                title={text ? text.label : t('create')}
                closeLabel={tDrawer('close')}
                footer={footer}
            >
                <form id={FORM_ID} onSubmit={form.handleSubmit} className="space-y-4" noValidate>
                    {/* Error */}
                    {form.failure !== null && (
                        <p role="alert" className="text-sm text-status-danger">
                            {apiErrorMessage(form.failure)}
                        </p>
                    )}

                    {/* Where it shows */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <AdminField label={tDrawer('eventType')} required>
                            <select value={form.eventType} onChange={form.handleEventTypeChange} className={adminInputClass()}>
                                {eventTypes.map((option) => (
                                    <option key={option.key} value={option.key}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{tFields('language')}</p>
                            <InvitationThemeSegmented
                                label={tFields('language')}
                                options={languageOptions}
                                value={form.draft.language}
                                onChangeAction={form.handleLanguageChange}
                                fill
                            />
                        </div>
                    </div>

                    {/* Label */}
                    <AdminField label={t('label')} required hint={form.errors.label ? tChecks('upTo100') : t('labelHint')}>
                        <input
                            name="label"
                            value={form.draft.label}
                            onChange={form.handleFieldChange}
                            maxLength={INVITATION_TEXT_LABEL_MAX}
                            autoComplete="off"
                            aria-invalid={Boolean(form.errors.label)}
                            className={adminInputClass()}
                        />
                    </AdminField>

                    {/* Text */}
                    <AdminField label={t('body')} required hint={form.errors.body ? tChecks('upTo2000') : undefined}>
                        <textarea
                            name="body"
                            value={form.draft.body}
                            onChange={form.handleFieldChange}
                            maxLength={INVITATION_TEXT_BODY_MAX}
                            rows={8}
                            aria-invalid={Boolean(form.errors.body)}
                            className={adminInputClass('resize-y')}
                        />
                    </AdminField>

                    {/* Order */}
                    <AdminField label={tDrawer('sortOrder')} className="max-w-40">
                        <input
                            name="sortOrder"
                            type="number"
                            inputMode="numeric"
                            step={1}
                            value={form.draft.sortOrder}
                            onChange={form.handleFieldChange}
                            className={adminInputClass('font-mono')}
                        />
                    </AdminField>
                </form>
            </AdminDrawer>

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={form.confirmingDelete}
                title={t('deleteTitle')}
                body={t('deleteBody')}
                confirmLabel={t('deleteConfirm')}
                cancelLabel={tDrawer('cancel')}
                onCloseAction={form.closeDelete}
                onConfirmAction={form.confirmDelete}
                isConfirming={form.isDeleting}
            />
        </>
    );
}
