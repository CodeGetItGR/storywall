'use client';

import { Copy, Eye, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';

import { useAdminDrawerFooterSlot } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { InvitationThemeSegmented } from '@/components/admin/invitationThemes/InvitationThemeSegmented';
import { useInvitationThemeDrawer } from '@/hooks/useInvitationThemeDrawer';
import type { EventTypeOption } from '@/hooks/useInvitationThemesCatalog';
import {
    type AdminInvitationThemeDto,
    THEME_NAME_MAX,
    THEME_SEO_DESCRIPTION_MAX,
    THEME_SEO_TITLE_MAX,
    THEME_SLUG_MAX,
} from '@/lib/adminInvitationThemes';

const FORM_ID = 'invitation-theme-form';

export function InvitationThemeDetailsForm({
    theme,
    eventTypes,
    onCloseAction,
    onDuplicateAction,
    onPreviewAction,
}: {
    theme: AdminInvitationThemeDto;
    eventTypes: EventTypeOption[];
    onCloseAction: () => void;
    onDuplicateAction: (theme: AdminInvitationThemeDto) => void;
    onPreviewAction: (themeId: string) => void;
}) {
    const t = useTranslations('AdminPage.invitationThemes.drawer');
    const footerSlot = useAdminDrawerFooterSlot();
    const form = useInvitationThemeDrawer(theme, eventTypes);
    const { details, errors, slugHint } = form;

    function handlePreview() {
        onPreviewAction(form.saved.id);
    }

    function handleDuplicate() {
        if (form.duplicateBlocked) return;
        onDuplicateAction(form.saved);
    }

    const footer = (
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {/* Actions */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handlePreview}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas"
                >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    {t('preview')}
                </button>
                <button
                    type="button"
                    onClick={handleDuplicate}
                    // aria-disabled, not disabled: a disabled button gets no hover, so "Save first" would never show.
                    aria-disabled={form.duplicateBlocked}
                    title={form.isDirty ? t('duplicateUnsaved') : undefined}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
                >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {t('duplicate')}
                </button>
            </div>

            {/* Save */}
            <div className="ml-auto flex gap-2">
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
                    disabled={!form.isDirty || form.isSaving}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                    {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {t('save')}
                </button>
            </div>
        </div>
    );

    return (
        <form id={FORM_ID} onSubmit={form.handleSubmit} className="space-y-4" noValidate>
            {/* Error */}
            {form.failureMessage && (
                <p role="alert" className="text-sm text-status-danger">
                    {form.failureMessage}
                </p>
            )}

            {/* Identity */}
            <AdminField label={t('name')} required hint={errors.name ? t('nameInvalid') : undefined}>
                <input
                    name="name"
                    value={details.name}
                    onChange={form.handleFieldChange}
                    maxLength={THEME_NAME_MAX}
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name)}
                    className={adminInputClass()}
                />
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <AdminField label={t('eventType')} required>
                    <select name="eventType" value={details.eventType} onChange={form.handleFieldChange} className={adminInputClass()}>
                        {form.eventTypeOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </AdminField>
                <AdminField label={t('sortOrder')} required>
                    <input
                        name="sortOrder"
                        type="number"
                        inputMode="numeric"
                        step={1}
                        value={details.sortOrder}
                        onChange={form.handleFieldChange}
                        aria-invalid={Boolean(errors.sortOrder)}
                        className={adminInputClass('font-mono')}
                    />
                </AdminField>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
                <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('status')}</p>
                <InvitationThemeSegmented label={t('status')} options={form.statusOptions} value={details.status} onChangeAction={form.handleStatusChange} fill />
                <p className="text-xs leading-5 text-ink-faint">{form.statusHint}</p>
            </div>

            {/* Link */}
            <AdminField label={t('slug')} required hint={slugHint}>
                <input
                    name="slug"
                    value={details.slug}
                    onChange={form.handleFieldChange}
                    maxLength={THEME_SLUG_MAX}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(slugHint)}
                    className={adminInputClass('font-mono')}
                />
            </AdminField>

            {/* Search */}
            <AdminField
                label={t('seoTitle')}
                optional
                hint={t('counter', { count: details.seoTitle.length, max: THEME_SEO_TITLE_MAX })}
                hintId="invitation-theme-seo-title-count"
                hintLive={false}
            >
                <input
                    name="seoTitle"
                    value={details.seoTitle}
                    onChange={form.handleFieldChange}
                    maxLength={THEME_SEO_TITLE_MAX}
                    aria-describedby="invitation-theme-seo-title-count"
                    className={adminInputClass()}
                />
            </AdminField>
            <AdminField
                label={t('seoDescription')}
                optional
                hint={t('counter', { count: details.seoDescription.length, max: THEME_SEO_DESCRIPTION_MAX })}
                hintId="invitation-theme-seo-description-count"
                hintLive={false}
            >
                <textarea
                    name="seoDescription"
                    value={details.seoDescription}
                    onChange={form.handleFieldChange}
                    maxLength={THEME_SEO_DESCRIPTION_MAX}
                    rows={3}
                    aria-describedby="invitation-theme-seo-description-count"
                    className={adminInputClass('resize-y')}
                />
            </AdminField>

            {/* Footer */}
            {footerSlot && createPortal(footer, footerSlot)}
        </form>
    );
}
