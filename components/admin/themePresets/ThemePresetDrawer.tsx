'use client';

import { ImagePlus, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ReactionTypeAvailabilityControl } from '@/components/admin/ReactionTypeAvailabilityControl';
import { ThemePresetPreview } from '@/components/admin/themePresets/ThemePresetPreview';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useThemePresetDrawer } from '@/hooks/useThemePresetDrawer';
import {
    formatContrastRatio,
    isServiceValidationError,
    MIN_INK_CONTRAST,
    MIN_TITLE_CONTRAST,
    THEME_ILLUSTRATION_ACCEPT,
    THEME_PRESET_NAME_MAX,
    type ThemeFontOption,
} from '@/lib/adminThemePresets';
import { ApiError } from '@/lib/api/client';
import type { AdminThemePresetDto, EventTypeConvention } from '@/lib/api/types';

const FORM_ID = 'theme-preset-form';
const FONT_OPTION_LABEL_KEYS = { live: 'headingFontOption', archived: 'headingFontArchived', noFile: 'headingFontNoFile' } as const;

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
    const tApi = useTranslations('ApiErrors');
    const localizedText = useLocalizedText();
    const locale = useLocale();
    const apiErrorMessage = useApiErrorMessage();
    const form = useThemePresetDrawer({ preset, sortOrder, onDoneAction: onCloseAction });
    const keyHint = form.failure?.kind === 'keyTaken' ? t('keyTaken') : form.errors.key ? t('keyInvalid') : undefined;
    const formatMinimum = (value: number) => new Intl.NumberFormat(locale).format(value);
    // Ratios are floored, like the server's, so a colour just under the minimum never reads as passing.
    // One contrast message at a time: once a save is blocked, the alert below replaces the live hint.
    const contrastHint =
        form.contrastRatio === null || form.errors.backgroundContrast
            ? undefined
            : form.contrastRatio < MIN_INK_CONTRAST
              ? t('contrastLow', { ratio: formatContrastRatio(form.contrastRatio, locale), min: formatMinimum(MIN_INK_CONTRAST) })
              : t('contrastOk', { ratio: formatContrastRatio(form.contrastRatio, locale) });
    const titleColorHint = form.errors.titleColor
        ? t('titleColorInvalid')
        : !form.draft.titleColor
          ? t('titleColorInkHint')
          : form.titleContrastRatio === null || form.errors.titleContrast
            ? undefined
            : form.titleContrastRatio < MIN_TITLE_CONTRAST
              ? t('titleContrastLow', { ratio: formatContrastRatio(form.titleContrastRatio, locale), min: formatMinimum(MIN_TITLE_CONTRAST) })
              : t('titleContrastOk', { ratio: formatContrastRatio(form.titleContrastRatio, locale) });
    const fontHint = form.fontsStatus === 'loading' ? t('headingFontLoading') : form.fontsStatus === 'error' ? t('headingFontLoadFailed') : undefined;
    const fontLabel = (option: ThemeFontOption) => t(FONT_OPTION_LABEL_KEYS[option.status], { familyName: option.familyName, key: option.key });
    // A non-ApiError is fetch failing before any response: offline, DNS, the server down. A service-rule
    // 3001 (background contrast, a type that can't be themed) highlights no field, so the hook's "check
    // the highlighted fields" would point at nothing: its localized detail says what's wrong instead.
    const describeServerError = (error: unknown) => {
        if (!(error instanceof ApiError)) return t('network');
        if (isServiceValidationError(error)) return error.problem?.detail?.trim() || tApi('generic');
        return apiErrorMessage(error);
    };
    const serverError = form.failure?.kind === 'other' ? describeServerError(form.failure.error) : null;
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
                    {serverError !== null && (
                        <p role="alert" className="text-sm text-status-danger">
                            {serverError}
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

                    {/* Title colour */}
                    <div className="space-y-1.5">
                        <AdminField label={t('titleColor')} hint={titleColorHint}>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    name="titleColor"
                                    value={form.titleColorInputValue}
                                    onChange={form.handleFieldChange}
                                    aria-label={t('titleColor')}
                                    className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-white p-1"
                                />
                                <input
                                    name="titleColor"
                                    value={form.draft.titleColor}
                                    onChange={form.handleFieldChange}
                                    maxLength={7}
                                    placeholder={t('titleColorPlaceholder')}
                                    aria-label={t('titleColor')}
                                    aria-invalid={Boolean(form.errors.titleColor || form.errors.titleContrast)}
                                    className={adminInputClass('font-mono uppercase placeholder:normal-case')}
                                />
                            </div>
                            {form.errors.titleContrast && (
                                <span role="alert" className="text-[11px] leading-4 font-semibold text-status-danger">
                                    {t('titleContrastInvalid')}
                                </span>
                            )}
                        </AdminField>
                        <button
                            type="button"
                            onClick={form.handleUseInk}
                            disabled={!form.draft.titleColor}
                            className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-50"
                        >
                            {t('titleColorUseInk')}
                        </button>
                    </div>

                    {/* Heading font */}
                    <div className="space-y-1">
                        <AdminField label={t('headingFont')} hint={fontHint}>
                            <select
                                name="headingFontId"
                                value={form.draft.headingFontId}
                                onChange={form.handleFieldChange}
                                className={adminInputClass()}
                            >
                                <option value="">{t('headingFontDefault')}</option>
                                {form.fontOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {fontLabel(option)}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        {form.fontsStatus === 'ready' && !form.hasUsableFonts && (
                            <p className="text-[11px] leading-4 text-ink-faint">
                                {t('headingFontEmpty')}{' '}
                                <a href="#theme-fonts" className="font-semibold text-primary underline-offset-2 hover:underline">
                                    {t('headingFontEmptyLink')}
                                </a>
                            </p>
                        )}
                    </div>

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
                    titleColor={form.previewTitleColor}
                    headingFont={form.previewFont}
                    title={form.previewTitle || tPreview('sampleTitle')}
                />
            </div>
        </AdminDrawer>
    );
}
