'use client';

import { ArrowRight, ImagePlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUploadQrMediaBatch } from '@/hooks/useQrMediaUpload';

interface AnonymousQrMediaUploadFormProps {
    token: string;
}

export function AnonymousQrMediaUploadForm({ token }: AnonymousQrMediaUploadFormProps) {
    const t = useTranslations('QrCodePage');
    const toErrorMessage = useApiErrorMessage();
    const uploadBatch = useUploadQrMediaBatch();

    const [uploaderName, setUploaderName] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleUploaderNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setUploaderName(e.target.value);
    }, []);

    const handleFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFiles(e.target.files ? Array.from(e.target.files) : []);
    }, []);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (files.length === 0) return;

        setSubmitError(null);
        try {
            await uploadBatch.mutateAsync({ token, files, uploaderName: uploaderName.trim() || undefined });
            setDone(true);
            setFiles([]);
        } catch (err) {
            setSubmitError(toErrorMessage(err));
        }
    }

    if (done) {
        return <p className="text-sm text-center text-ink-muted">{t('anonymousUpload.success')}</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormFieldLabel label={t('anonymousUpload.nameLabel')} optional>
                <input
                    type="text"
                    maxLength={100}
                    value={uploaderName}
                    onChange={handleUploaderNameChange}
                    placeholder={t('anonymousUpload.namePlaceholder')}
                    className="w-full bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
            </FormFieldLabel>

            <FormFieldLabel label={t('anonymousUpload.filesLabel')} required>
                <label className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 cursor-pointer">
                    <ImagePlus className="w-4 h-4 text-ink-muted shrink-0" />
                    <span className="flex-1 text-sm text-ink-muted truncate">
                        {files.length > 0 ? t('anonymousUpload.filesSelected', { count: files.length }) : t('anonymousUpload.chooseFiles')}
                    </span>
                    <input type="file" accept="image/*,video/*" multiple onChange={handleFilesChange} className="hidden" />
                </label>
            </FormFieldLabel>

            {submitError && (
                <p role="alert" className="text-xs text-center text-red-500 -mt-1">
                    {submitError}
                </p>
            )}

            <button
                type="submit"
                disabled={uploadBatch.isPending || files.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {uploadBatch.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        {t('anonymousUpload.submit')}
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}
