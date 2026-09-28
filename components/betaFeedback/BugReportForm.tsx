'use client';

import { useTranslations } from 'next-intl';

import { BugReportScreenshotField } from '@/components/betaFeedback/BugReportScreenshotField';
import type { useBugReportForm } from '@/hooks/useBugReportForm';

type BugReportFormProps = {
    form: ReturnType<typeof useBugReportForm>;
    onCancelAction: () => void;
};

export function BugReportForm({ form, onCancelAction }: BugReportFormProps) {
    const t = useTranslations('BugReport');

    return (
        <form className="flex flex-col gap-5" onSubmit={form.handleSubmit} onPaste={form.handlePaste}>
            {/* Header */}
            <div>
                <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('nameNotShown')}</p>
            </div>

            {/* Description */}
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                {t('description')}
                <textarea
                    value={form.description}
                    onChange={form.handleDescriptionChange}
                    maxLength={form.descriptionMax}
                    disabled={form.isSubmitting}
                    required
                    rows={5}
                    placeholder={t('descriptionPlaceholder')}
                    className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal text-ink transition-colors outline-none placeholder:text-ink-faint focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span className="text-xs font-normal text-ink-faint">{t('descriptionHint')}</span>
            </label>

            {/* Screenshot */}
            <BugReportScreenshotField
                accept={form.accept}
                disabled={form.isSubmitting}
                error={form.screenshotError}
                file={form.screenshot}
                maxMegabytes={form.maxMegabytes}
                onChangeAction={form.handleScreenshotChange}
                onRemoveAction={form.removeScreenshot}
            />

            {/* Errors */}
            {form.submitError && (
                <div role="alert" className="text-sm text-destructive">
                    <p>{form.submitError}</p>
                    {form.fieldErrors.length > 0 && (
                        <ul className="mt-1 list-disc pl-5">
                            {form.fieldErrors.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancelAction}
                    disabled={form.isSubmitting}
                    className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-60"
                >
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    disabled={!form.canSubmit}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.isSubmitting ? t('sending') : t('send')}
                </button>
            </div>
        </form>
    );
}
