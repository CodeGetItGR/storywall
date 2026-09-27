'use client';

import { ImagePlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';

type BugReportScreenshotFieldProps = {
    accept: string;
    disabled: boolean;
    error: string | null;
    file: File | null;
    maxMegabytes: number;
    onChangeAction: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveAction: () => void;
};

export function BugReportScreenshotField({
    accept,
    disabled,
    error,
    file,
    maxMegabytes,
    onChangeAction,
    onRemoveAction,
}: BugReportScreenshotFieldProps) {
    const t = useTranslations('BugReport');

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">
                {t('screenshot')} <span className="text-xs font-normal text-ink-faint">({t('optional')})</span>
            </span>

            {/* Picker or chosen file */}
            {file ? (
                <div className="flex min-h-11 items-center gap-2 rounded-xl bg-surface-muted px-3 text-sm text-ink">
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <button
                        type="button"
                        onClick={onRemoveAction}
                        disabled={disabled}
                        aria-label={t('removeScreenshot')}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink disabled:opacity-60"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            ) : (
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm text-ink-muted hover:text-ink has-disabled:cursor-not-allowed has-disabled:opacity-60">
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {t('addScreenshot', { size: maxMegabytes })}
                    <input type="file" accept={accept} onChange={onChangeAction} disabled={disabled} className="sr-only" />
                </label>
            )}

            {/* Size problem or privacy note */}
            {error ? (
                <p role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            ) : (
                <p className="text-xs text-ink-faint">{t('screenshotPrivacy')}</p>
            )}
        </div>
    );
}
