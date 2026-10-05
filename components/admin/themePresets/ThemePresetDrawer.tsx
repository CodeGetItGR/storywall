'use client';

import { ImagePlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ReactionTypeAvailabilityControl } from '@/components/admin/ReactionTypeAvailabilityControl';
import { ThemePresetPreview } from '@/components/admin/themePresets/ThemePresetPreview';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useThemePresetDrawer } from '@/hooks/useThemePresetDrawer';
import { MIN_INK_CONTRAST, THEME_ILLUSTRATION_ACCEPT, THEME_PRESET_NAME_MAX } from '@/lib/adminThemePresets';
import { getErrorMessage } from '@/lib/api/errors';
import type { AdminThemePresetDto, EventTypeConvention } from '@/lib/api/types';

const FORM_ID = 'theme-preset-form';

export function ThemePresetDrawer({
    preset,
    sortOrder,
    eventTypes,
    onCloseAction,
}: {
    preset: AdminThemePresetDto | null;
    sortOrder: number;
    eventTypes: Array<{ eventTypeKey: EventTypeConvention; label: string }>;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.themePresets.drawer');
    const tPreview = useTranslations('AdminPage.themePresets.preview');
    const localizedText = useLocalizedText();
    const form = useThemePresetDrawer({ preset, sortOrder, onDoneAction: onCloseAction });
    const keyHint = form.failure?.kind === 'keyTaken' ? t('keyTaken') : form.errors.key ? t('keyInvalid') : undefined;
    // Floored, so a colour just under the minimum never reads as passing.
    const contrast = form.contrastRatio === null ? null : (Math.floor(form.contrastRatio * 100) / 100).toFixed(2);
    // One contrast message at a time: once a save is blocked, the alert below replaces the live hint.
    const contrastHint =
        contrast === null || form.errors.backgroundContrast
            ? undefined
            : form.contrastRatio !== null && form.contrastRatio < MIN_INK_CONTRAST
              ? t('contrastLow', { ratio: contrast, min: MIN_INK_CONTRAST })
              : t('contrastOk', { ratio: contrast });
    const fileHint = form.fileError === 'type' ? t('illustrationType') : form.fileError === 'size' ? t('illustrationSize') : undefined;

    const footer = (
        <div className="flex w-full items-center justify-end gap-2">
            {/* Save */}
            <button type="button" onClick={onCloseAction} className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink">
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
        <AdminDrawer
            open
            size="wide"
            onClose={onCloseAction}
            title={preset ? localizedText(preset.name, preset.key) : t('createTitle')}
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
                    {form.failure?.kind === 'other' && (
                        <p role="alert" className="text-sm text-status-danger">
                            {getErrorMessage(form.failure.error)}
                        </p>
                    )}

                    {/* Identity */}
                    <AdminField label={t('key')} required={form.isCreate} hint={keyHint}>
                        {form.isCreate ? (
                            <input
                                name="key"
                                value={form.draft.key}
                                onChange={form.handleFieldChange}
                                maxLength={63}
                                autoComplete="off"
                                aria-invalid={Boolean(keyHint)}
                                className={adminInputClass('font-mono')}
                            />
                        ) : (
                            <p className="font-mono text-sm text-ink">{form.draft.key}</p>
                        )}
                    </AdminField>
                    <AdminField label={t('nameEn')} required hint={form.errors.nameEn ? t('nameInvalid') : undefined}>
                        <input
                            name="nameEn"
                            value={form.draft.nameEn}
                            onChange={form.handleFieldChange}
                            maxLength={THEME_PRESET_NAME_MAX}
                            aria-invalid={Boolean(form.errors.nameEn)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('nameEl')} required hint={form.errors.nameEl ? t('nameInvalid') : undefined}>
                        <input
                            name="nameEl"
                            value={form.draft.nameEl}
                            onChange={form.handleFieldChange}
                            maxLength={THEME_PRESET_NAME_MAX}
                            aria-invalid={Boolean(form.errors.nameEl)}
                            className={adminInputClass()}
                        />
                    </AdminField>

                    {/* Colour */}
                    <AdminField label={t('backgroundColor')} required hint={form.errors.backgroundColor ? t('backgroundColorInvalid') : contrastHint}>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                name="backgroundColor"
                                value={form.colorInputValue}
                                onChange={form.handleFieldChange}
                                aria-label={t('backgroundColor')}
                                className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-white p-1"
                            />
                            <input
                                name="backgroundColor"
                                value={form.draft.backgroundColor}
                                onChange={form.handleFieldChange}
                                maxLength={7}
                                aria-invalid={Boolean(form.errors.backgroundColor || form.errors.backgroundContrast)}
                                className={adminInputClass('font-mono uppercase')}
                            />
                        </div>
                        {form.errors.backgroundContrast && (
                            <span role="alert" className="text-[11px] leading-4 font-semibold text-status-danger">
                                {t('backgroundContrastInvalid')}
                            </span>
                        )}
                    </AdminField>

                    {/* Event types */}
                    <fieldset>
                        <legend className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('eventTypes')}</legend>
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

                    {/* Illustration */}
                    <AdminField label={t('illustration')} hint={fileHint ?? (form.hasPendingFile ? t('illustrationPending') : t('illustrationHint'))}>
                        <label className="inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas">
                            <ImagePlus className="h-4 w-4" aria-hidden="true" />
                            {t('illustrationChoose')}
                            <input type="file" accept={THEME_ILLUSTRATION_ACCEPT} onChange={form.handleFileChange} className="sr-only" />
                        </label>
                    </AdminField>

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
                <ThemePresetPreview
                    backgroundColor={form.previewColor}
                    illustrationUrl={form.previewIllustrationUrl}
                    title={form.previewTitle || tPreview('sampleTitle')}
                />
            </div>
        </AdminDrawer>
    );
}
