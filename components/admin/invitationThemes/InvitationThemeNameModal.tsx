'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useInvitationThemeNameModal } from '@/hooks/useInvitationThemeNameModal';
import type { EventTypeOption, InvitationThemeNameModalState } from '@/hooks/useInvitationThemesCatalog';
import { type AdminInvitationThemeDto, type AdminInvitationThemeSummaryDto, THEME_NAME_MAX } from '@/lib/adminInvitationThemes';

// A new theme (name and event type) or a copy of one (name). The owner keys it on each
// opening, so it always starts fresh.
export function InvitationThemeNameModal({
    state,
    themes,
    eventTypes,
    onCloseAction,
    onNamedAction,
}: {
    state: NonNullable<InvitationThemeNameModalState>;
    themes: AdminInvitationThemeSummaryDto[];
    eventTypes: EventTypeOption[];
    onCloseAction: () => void;
    onNamedAction: (theme: AdminInvitationThemeDto) => void;
}) {
    const t = useTranslations('AdminPage.invitationThemes.nameModal');
    const tDrawer = useTranslations('AdminPage.invitationThemes.drawer');
    const apiErrorMessage = useApiErrorMessage();
    const form = useInvitationThemeNameModal({ state, themes, onNamedAction });
    const isDuplicate = state.mode === 'duplicate';
    const title = isDuplicate ? t('duplicateTitle') : t('createTitle');
    const failureMessage =
        form.failure?.kind === 'slugTaken' ? tDrawer('slugTaken') : form.failure?.kind === 'other' ? apiErrorMessage(form.failure.error) : null;

    return (
        <Modal open onClose={onCloseAction} size="sm" closeLabel={t('cancel')} ariaLabel={title} closeDisabled={form.isSaving}>
            <form onSubmit={form.handleSubmit} className="space-y-5 p-5" noValidate>
                {/* Header */}
                <h3 className="text-lg font-semibold text-ink">{title}</h3>

                {/* Error */}
                {failureMessage && (
                    <p role="alert" className="text-sm text-status-danger">
                        {failureMessage}
                    </p>
                )}

                {/* Fields */}
                <div className="space-y-4">
                    <AdminField label={t('name')} required hint={form.nameInvalid ? tDrawer('nameInvalid') : undefined}>
                        <input
                            name="name"
                            value={form.name}
                            onChange={form.handleNameChange}
                            maxLength={THEME_NAME_MAX}
                            autoComplete="off"
                            autoFocus
                            aria-invalid={form.nameInvalid}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    {!isDuplicate && (
                        <AdminField label={t('eventType')} required>
                            <select name="eventType" value={form.eventType} onChange={form.handleEventTypeChange} className={adminInputClass()}>
                                {eventTypes.map((option) => (
                                    <option key={option.key} value={option.key}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCloseAction}
                        disabled={form.isSaving}
                        className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={form.isSaving}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {isDuplicate ? t('duplicate') : t('create')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
