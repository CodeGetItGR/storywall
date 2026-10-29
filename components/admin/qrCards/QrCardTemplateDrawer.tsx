'use client';

import { ImagePlus, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { QrCardTemplatePreview } from '@/components/admin/qrCards/QrCardTemplatePreview';
import { ReactionTypeAvailabilityControl } from '@/components/admin/ReactionTypeAvailabilityControl';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useQrCardTemplateDrawer } from '@/hooks/useQrCardTemplateDrawer';
import { isQrCardDetailError, MIN_CODE_CONTRAST, QR_CARD_NAME_MAX } from '@/lib/adminQrCards';
import { formatContrastRatio, THEME_ILLUSTRATION_ACCEPT, type ThemeFontOption } from '@/lib/adminThemePresets';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto, EventTypeConvention } from '@/lib/api/types';

const FORM_ID = 'qr-card-template-form';
const FONT_OPTION_LABEL_KEYS = { live: 'headingFontOption', archived: 'headingFontArchived', noFile: 'headingFontNoFile' } as const;
const SWATCH_CLASS = 'h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-white p-1';
const GROUP_LABEL_CLASS = 'text-[11px] font-bold tracking-wide text-ink-muted uppercase';

export function QrCardTemplateDrawer({
    template,
    sortOrder,
    eventTypes,
    onCloseAction,
}: {
    template: AdminQrCardTemplateDto | null;
    sortOrder: number;
    eventTypes: Array<{ eventTypeKey: EventTypeConvention; label: string }>;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.qrCards.drawer');
    const tPreview = useTranslations('AdminPage.qrCards.preview');
    const tApi = useTranslations('ApiErrors');
    const locale = useLocale();
    const apiErrorMessage = useApiErrorMessage();
    const form = useQrCardTemplateDrawer({ template, sortOrder, onDoneAction: onCloseAction });
    const hintIdPrefix = useId();
    const nameEnHintId = `${hintIdPrefix}-name-en`;
    const nameElHintId = `${hintIdPrefix}-name-el`;
    const textColorHintId = `${hintIdPrefix}-text-color`;
    const codeColorHintId = `${hintIdPrefix}-code-color`;
    const formatMinimum = (value: number) => new Intl.NumberFormat(locale).format(value);
    // Floored like the server's ratio, so a colour just under the minimum never reads as passing. Once a
    // save is blocked, the alert below replaces the live hint.
    const codeHint = form.errors.codeColor
        ? t('codeColorInvalid')
        : form.codeContrastRatio === null || form.errors.codeContrast
          ? undefined
          : form.codeContrastRatio < MIN_CODE_CONTRAST
            ? t('codeContrastLow', { ratio: formatContrastRatio(form.codeContrastRatio, locale), min: formatMinimum(MIN_CODE_CONTRAST) })
            : t('codeContrastOk', { ratio: formatContrastRatio(form.codeContrastRatio, locale) });
    const fontHint = form.fontsStatus === 'loading' ? t('headingFontLoading') : form.fontsStatus === 'error' ? t('headingFontLoadFailed') : undefined;
    const fontLabel = (option: ThemeFontOption) => t(FONT_OPTION_LABEL_KEYS[option.status], { familyName: option.familyName, key: option.key });
    // A non-ApiError is fetch failing before any response. Contrast, artwork size and name rejections
    // highlight no field: their localized detail says what's wrong instead.
    const describeServerError = (error: unknown) => {
        if (!(error instanceof ApiError)) return t('network');
        if (isQrCardDetailError(error)) return error.problem?.detail?.trim() || tApi('generic');
        return apiErrorMessage(error);
    };
    const serverError = form.failure?.kind === 'other' ? describeServerError(form.failure.error) : null;
    const fileHint = form.fileError === 'type' ? t('artworkType') : form.fileError === 'size' ? t('artworkSize') : undefined;

    const footer = (
        <div className="flex w-full items-center justify-end gap-2">
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

                    {/* Text */}
                    <AdminField
                        label={t('textColor')}
                        required
                        hint={form.errors.textColor ? t('textColorInvalid') : undefined}
                        hintId={textColorHintId}
                    >
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                name="textColor"
                                value={form.textColorInputValue}
                                onChange={form.handleFieldChange}
                                aria-label={t('textColor')}
                                aria-describedby={form.errors.textColor ? textColorHintId : undefined}
                                className={SWATCH_CLASS}
                            />
                            <input
                                name="textColor"
                                value={form.draft.textColor}
                                onChange={form.handleFieldChange}
                                maxLength={7}
                                aria-label={t('textColorHex')}
                                aria-describedby={form.errors.textColor ? textColorHintId : undefined}
                                aria-invalid={Boolean(form.errors.textColor)}
                                className={adminInputClass('font-mono uppercase')}
                            />
                        </div>
                    </AdminField>
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

                    {/* Code */}
                    <AdminField label={t('codeColor')} required hint={codeHint} hintId={codeColorHintId}>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                name="codeColor"
                                value={form.codeColorInputValue}
                                onChange={form.handleFieldChange}
                                aria-label={t('codeColor')}
                                aria-describedby={codeHint ? codeColorHintId : undefined}
                                className={SWATCH_CLASS}
                            />
                            <input
                                name="codeColor"
                                value={form.draft.codeColor}
                                onChange={form.handleFieldChange}
                                maxLength={7}
                                aria-label={t('codeColorHex')}
                                aria-describedby={codeHint ? codeColorHintId : undefined}
                                aria-invalid={Boolean(form.errors.codeColor || form.errors.codeContrast)}
                                className={adminInputClass('font-mono uppercase')}
                            />
                        </div>
                        {form.errors.codeContrast && (
                            <span role="alert" className="text-[11px] leading-4 font-semibold text-status-danger">
                                {t('codeContrastInvalid')}
                            </span>
                        )}
                    </AdminField>
                    <AdminSwitch label={t('centerLogo')} checked={form.draft.centerLogo} onCheckedChangeAction={form.handleCenterLogoChange} />

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

                    {/* Artwork */}
                    <AdminField label={t('artwork')} hint={fileHint ?? (form.hasPendingFile ? t('artworkPending') : t('artworkHint'))}>
                        <label className="relative inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink focus-within:ring-2 focus-within:ring-primary/20 hover:bg-canvas">
                            <ImagePlus className="h-4 w-4" aria-hidden="true" />
                            {t('artworkChoose')}
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
                <QrCardTemplatePreview style={form.previewStyle} title={form.previewTitle || tPreview('sampleTitle')} />
            </div>
        </AdminDrawer>
    );
}
