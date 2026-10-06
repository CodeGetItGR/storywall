'use client';

import { Loader2, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ReactionTypeAvailabilityControl } from '@/components/admin/ReactionTypeAvailabilityControl';
import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useThemeFontDrawer } from '@/hooks/useThemeFontDrawer';
import {
    THEME_FONT_ACCEPT,
    THEME_FONT_CHARSET_SAMPLE,
    THEME_FONT_FAMILY_MAX,
    THEME_FONT_SAMPLE,
    themeFontMissingCharacters,
} from '@/lib/adminThemeFonts';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode, getErrorMessage } from '@/lib/api/errors';
import type { AdminThemeFontDto } from '@/lib/api/types';

const FORM_ID = 'theme-font-form';
const FALLBACKS = [
    { value: 'serif', labelKey: 'fallbackSerif' },
    { value: 'sans-serif', labelKey: 'fallbackSansSerif' },
] as const;

export function ThemeFontDrawer({ font, onCloseAction }: { font: AdminThemeFontDto | null; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.themeFonts.drawer');
    const apiErrorMessage = useApiErrorMessage();
    const form = useThemeFontDrawer({ font, onDoneAction: onCloseAction });

    const keyHint =
        form.failure?.kind === 'keyTaken'
            ? t('keyTaken')
            : form.failure?.kind === 'keyInvalid' || form.errors.key
              ? t('keyInvalid')
              : form.isCreate
                ? t('keyHint')
                : undefined;
    const familyNameInvalid = form.failure?.kind === 'familyNameInvalid' || Boolean(form.errors.familyName);
    const fileHint =
        form.fileError === 'type'
            ? t('fileType')
            : form.fileError === 'size'
              ? t('fileSize')
              : form.hasPendingFile
                ? t('filePending', { name: form.pendingFileName ?? '' })
                : t('fileHint');
    const failedWith = form.failure?.kind === 'other' ? form.failure.error : null;
    const serverError = form.failure?.kind === 'other' ? describeServerError(form.failure.error) : null;
    const retryIn = useRetryAfterCountdown(failedWith);

    function describeServerError(error: unknown): string {
        // A non-ApiError is fetch failing before any response: offline, DNS, the server down.
        if (!(error instanceof ApiError)) return t('network');
        const code = getErrorCode(error);
        // The body as a whole was over the server's limit: for this form that is the font file.
        if (code === ERROR_CODES.REQUEST_TOO_LARGE) return t('fileSize');
        // A 3001 that reaches here is about no field we show (an upload 3001). The backend sends a
        // localized detail for its service-level 3001s; a parallel backend change is adding message
        // keys for the preset validation rejections. Framework-level 3001s (a missing multipart part,
        // a bad UUID) are English, but a well-formed admin client never triggers them.
        if (code === ERROR_CODES.VALIDATION_FAILED) return getErrorMessage(error, '').trim() || apiErrorMessage(error);
        return apiErrorMessage(error);
    }
    const missing = form.failure?.kind === 'other' ? themeFontMissingCharacters(form.failure.error) : [];
    const sampleFont = form.previewFamily ? `"${form.previewFamily}", ${form.draft.fallback}` : form.draft.fallback;

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
                disabled={form.isSaving || retryIn > 0 || form.failure?.kind === 'notFound'}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
            >
                {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('save')}
            </button>
        </div>
    );

    return (
        // closeDisabled blocks ×, Esc and the overlay while saving, so a save never runs on behind a
        // drawer the admin thinks is gone. Back still closes (and unmounts) it mid-save; the hook's mounted
        // guard then skips the upload and onDoneAction.
        <AdminDrawer
            open
            size="wide"
            onClose={onCloseAction}
            closeDisabled={form.isSaving}
            title={font ? font.familyName : t('createTitle')}
            closeLabel={t('close')}
            footer={footer}
        >
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
                <form id={FORM_ID} onSubmit={form.handleSubmit} className="space-y-4" noValidate>
                    {/* Error */}
                    {form.failure?.kind === 'notFound' && (
                        <p role="alert" className="text-sm text-status-danger">
                            {t('notFound')}
                        </p>
                    )}
                    {serverError !== null && (
                        <div role="alert" className="space-y-1.5 text-sm text-status-danger">
                            {form.createdWithoutFile && <p className="font-semibold">{t('createdWithoutFile')}</p>}
                            <p>{serverError}</p>
                            {missing.length > 0 && (
                                <ul aria-label={t('missingCharacters')} className="flex flex-wrap gap-1">
                                    {missing.map((character) => (
                                        <li key={character} className="rounded border border-status-danger/30 px-1.5 font-mono text-[13px] leading-6">
                                            {character}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
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
                                aria-invalid={form.failure?.kind === 'keyTaken' || form.failure?.kind === 'keyInvalid' || Boolean(form.errors.key)}
                                className={adminInputClass('font-mono')}
                            />
                        ) : (
                            <p className="font-mono text-sm text-ink">{form.draft.key}</p>
                        )}
                    </AdminField>
                    <AdminField label={t('familyName')} required hint={familyNameInvalid ? t('familyNameInvalid') : t('familyNameHint')}>
                        <input
                            name="familyName"
                            value={form.draft.familyName}
                            onChange={form.handleFieldChange}
                            maxLength={THEME_FONT_FAMILY_MAX}
                            aria-invalid={familyNameInvalid}
                            className={adminInputClass()}
                        />
                    </AdminField>

                    {/* Fallback */}
                    <fieldset>
                        <legend className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('fallback')}</legend>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {FALLBACKS.map((option) => (
                                <label key={option.value} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-canvas">
                                    <input
                                        type="radio"
                                        name="fallback"
                                        value={option.value}
                                        checked={form.draft.fallback === option.value}
                                        onChange={form.handleFallbackChange}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    {t(option.labelKey)}
                                </label>
                            ))}
                        </div>
                        <p className="mt-1 text-[11px] leading-4 text-ink-faint">{t('fallbackHint')}</p>
                    </fieldset>

                    {/* File */}
                    <AdminField label={t('file')} hint={fileHint}>
                        <label className="inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas">
                            <Type className="h-4 w-4" aria-hidden="true" />
                            {t('fileChoose')}
                            <input type="file" accept={THEME_FONT_ACCEPT} onChange={form.handleFileChange} className="sr-only" />
                        </label>
                    </AdminField>

                    {/* Availability */}
                    {!form.isCreate && (
                        <ReactionTypeAvailabilityControl
                            title={t('availability')}
                            value={form.availability}
                            onChangeAction={form.handleAvailabilityChange}
                            labels={{ AVAILABLE: t('available'), ARCHIVED: t('archived') }}
                            hints={{ AVAILABLE: t('availableHint'), ARCHIVED: t('archivedHint') }}
                        />
                    )}
                </form>

                {/* Preview */}
                <section aria-label={t('preview')} className="space-y-2">
                    <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('preview')}</p>
                    <div className="space-y-2 rounded-lg border border-border bg-white p-4 text-ink">
                        <div data-testid="font-sample" style={{ fontFamily: sampleFont }} className="space-y-2">
                            <p className="text-[28px] leading-tight">{THEME_FONT_SAMPLE}</p>
                            <p className="text-lg leading-snug break-words">{THEME_FONT_CHARSET_SAMPLE}</p>
                        </div>
                    </div>
                    {form.previewFailed ? (
                        <p role="alert" className="text-xs leading-5 text-status-danger">
                            {form.previewFailed === 'saved' ? t('savedPreviewFailed') : t('previewFailed')}
                        </p>
                    ) : (
                        <p className="text-xs leading-5 text-ink-faint">{form.previewFamily ? t('previewHint') : t('previewEmpty')}</p>
                    )}
                    <p className="text-xs leading-5 text-ink-muted">{t('usedBy', { count: form.presetCount })}</p>
                </section>
            </div>
        </AdminDrawer>
    );
}
