'use client';

import { Copy, LayoutTemplate, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { QrCardLayoutEditor } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutEditor';
import { QrCardTemplatePreview } from '@/components/admin/qrCards/QrCardTemplatePreview';
import { ReactionTypeAvailabilityControl } from '@/components/admin/ReactionTypeAvailabilityControl';
import { useQrCardTemplateDrawer } from '@/hooks/useQrCardTemplateDrawer';
import { useQrCardTemplateDrawerCopy } from '@/hooks/useQrCardTemplateDrawerCopy';
import { QR_CARD_NAME_MAX } from '@/lib/adminQrCards';
import type { AdminQrCardTemplateDto, EventTypeConvention } from '@/lib/api/types';

const FORM_ID = 'qr-card-template-form';
const GROUP_LABEL_CLASS = 'text-[11px] font-bold tracking-wide text-ink-muted uppercase';

export function QrCardTemplateDrawer({
    template,
    sortOrder,
    eventTypes,
    onCloseAction,
    onDuplicatedAction,
}: {
    template: AdminQrCardTemplateDto | null;
    sortOrder: number;
    eventTypes: Array<{ eventTypeKey: EventTypeConvention; label: string }>;
    onCloseAction: () => void;
    onDuplicatedAction: (copy: AdminQrCardTemplateDto) => void;
}) {
    const t = useTranslations('AdminPage.qrCards.drawer');
    const tPreview = useTranslations('AdminPage.qrCards.preview');
    const tLayout = useTranslations('AdminPage.qrCards.layout');
    const form = useQrCardTemplateDrawer({ template, sortOrder, onDoneAction: onCloseAction, onDuplicatedAction });
    const { serverError } = useQrCardTemplateDrawerCopy(form);
    const hintIdPrefix = useId();
    const nameEnHintId = `${hintIdPrefix}-name-en`;
    const nameElHintId = `${hintIdPrefix}-name-el`;

    const footer = (
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {/* Duplicate */}
            {!form.isCreate && (
                <div className="mr-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={form.duplicate}
                        disabled={form.isSaving || form.hasUnsavedChanges || form.failure?.kind === 'notFound'}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
                    >
                        {form.isDuplicating ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                        {t('duplicate')}
                    </button>
                    {form.hasUnsavedChanges && <span className="text-xs text-ink-muted">{t('duplicateUnsaved')}</span>}
                </div>
            )}
            {/* Save */}
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
                form={FORM_ID}
                disabled={form.isSaving || form.failure?.kind === 'notFound'}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
            >
                {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('save')}
            </button>
        </div>
    );

    return (
        // closeDisabled blocks ×, Esc and the overlay while saving; the hook's mounted guard covers Back.
        <AdminDrawer
            open
            size="wide"
            onClose={onCloseAction}
            closeDisabled={form.isSaving}
            title={form.isCreate ? t('createTitle') : form.savedName}
            closeLabel={t('close')}
            footer={footer}
        >
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
                <form id={FORM_ID} onSubmit={form.handleSubmit} className="space-y-4" noValidate>
                    {/* Error */}
                    {form.failure?.kind === 'notFound' && (
                        <p role="alert" className="text-sm text-status-danger">
                            {t('notFound')}
                        </p>
                    )}
                    {serverError !== null && (
                        <p role="alert" className="text-sm text-status-danger">
                            {serverError}
                        </p>
                    )}

                    {/* Names */}
                    <AdminField label={t('nameEn')} required hint={form.errors.nameEn ? t('nameInvalid') : undefined} hintId={nameEnHintId}>
                        <input
                            name="nameEn"
                            value={form.draft.nameEn}
                            onChange={form.handleFieldChange}
                            maxLength={QR_CARD_NAME_MAX}
                            aria-invalid={Boolean(form.errors.nameEn)}
                            aria-describedby={form.errors.nameEn ? nameEnHintId : undefined}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('nameEl')} required hint={form.errors.nameEl ? t('nameInvalid') : undefined} hintId={nameElHintId}>
                        <input
                            name="nameEl"
                            value={form.draft.nameEl}
                            onChange={form.handleFieldChange}
                            maxLength={QR_CARD_NAME_MAX}
                            aria-invalid={Boolean(form.errors.nameEl)}
                            aria-describedby={form.errors.nameEl ? nameElHintId : undefined}
                            className={adminInputClass()}
                        />
                    </AdminField>

                    {/* Event types */}
                    <fieldset>
                        <legend className={GROUP_LABEL_CLASS}>{t('eventTypes')}</legend>
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                            {eventTypes.map((eventType) => (
                                <label
                                    key={eventType.eventTypeKey}
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-canvas"
                                >
                                    <input
                                        type="checkbox"
                                        value={eventType.eventTypeKey}
                                        checked={form.draft.eventTypes.includes(eventType.eventTypeKey)}
                                        onChange={form.handleEventTypeChange}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    {eventType.label}
                                </label>
                            ))}
                        </div>
                        {form.errors.eventTypes && <p className="mt-1 text-[11px] text-status-danger">{t('eventTypesInvalid')}</p>}
                    </fieldset>

                    {/* Design */}
                    {!form.isCreate && (
                        <button
                            type="button"
                            onClick={form.openLayoutEditor}
                            disabled={form.isSaving}
                            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
                        >
                            <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
                            {tLayout('edit')}
                        </button>
                    )}

                    {/* Availability */}
                    {!form.isCreate && (
                        <ReactionTypeAvailabilityControl
                            title={t('availability')}
                            value={form.availability}
                            onChangeAction={form.handleAvailabilityChange}
                            labels={{ AVAILABLE: t('offered'), ARCHIVED: t('archived') }}
                            hints={{ AVAILABLE: t('offeredHint'), ARCHIVED: t('archivedHint') }}
                        />
                    )}
                </form>

                {/* Preview */}
                <QrCardTemplatePreview style={form.previewStyle} title={form.previewTitle || tPreview('sampleTitle')} />
            </div>

            {/* Layout editor */}
            {form.layoutEditorOpen && form.savedTemplate && (
                <QrCardLayoutEditor template={form.savedTemplate} onSavedAction={form.handleLayoutSaved} onCloseAction={form.closeLayoutEditor} />
            )}
        </AdminDrawer>
    );
}
