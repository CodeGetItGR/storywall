'use client';

import { ArrowRight, ImagePlus, Loader2, Video, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useFilePreviews } from '@/hooks/useFilePreviews';
import { useUploadQrMediaBatch } from '@/hooks/useQrMediaUpload';
import { cn } from '@/lib/utils';

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
    const [isDragActive, setIsDragActive] = useState(false);
    const previews = useFilePreviews(files);

    const handleUploaderNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setUploaderName(e.target.value);
    }, []);

    const handleFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const added = e.target.files ? Array.from(e.target.files) : [];
        setFiles((prev) => [...prev, ...added]);
        e.target.value = '';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragActive(false);
        setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }, []);

    const handleRemoveFileClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-index]');
        if (!target) return;
        const index = Number(target.dataset.removeIndex);
        setFiles((prev) => prev.filter((_, i) => i !== index));
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
        return <p className="text-center text-sm text-ink-muted">{t('anonymousUpload.success')}</p>;
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
                    className="w-full rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                />
            </FormFieldLabel>

            <FormFieldLabel label={t('anonymousUpload.filesLabel')} required>
                <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 text-center transition-colors',
                        files.length > 0 ? 'py-4' : 'py-10',
                        isDragActive ? 'border-primary bg-primary/5' : 'border-ink-faint/30 bg-surface-muted hover:border-ink-faint/50',
                    )}
                >
                    <ImagePlus className={cn('h-6 w-6', isDragActive ? 'text-primary' : 'text-ink-faint')} />
                    <span className="text-sm font-medium text-ink">
                        {files.length > 0 ? t('anonymousUpload.addMore') : t('anonymousUpload.chooseFiles')}
                    </span>
                    <span className="text-xs text-ink-faint">{t('anonymousUpload.dropHint')}</span>
                    <input type="file" accept="image/*,video/*" multiple onChange={handleFilesChange} className="hidden" />
                </label>

                {previews.length > 0 && (
                    <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" onClick={handleRemoveFileClick}>
                        {previews.map((preview, index) => (
                            <div
                                key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
                                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-muted"
                            >
                                {preview.isVideo ? (
                                    <>
                                        <video src={preview.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                                        <Video className="absolute bottom-1 left-1 h-3.5 w-3.5 text-white drop-shadow" aria-hidden="true" />
                                    </>
                                ) : (
                                    <ProtectedImage src={preview.url} alt="" fill className="object-cover" sizes="80px" unoptimized />
                                )}
                                <button
                                    type="button"
                                    data-remove-index={index}
                                    aria-label={t('anonymousUpload.removeFile')}
                                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </FormFieldLabel>

            {submitError && (
                <p role="alert" className="-mt-1 text-center text-xs text-red-500">
                    {submitError}
                </p>
            )}

            <button
                type="submit"
                disabled={uploadBatch.isPending || files.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {uploadBatch.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        {t('anonymousUpload.submit')}
                        <ArrowRight className="h-4 w-4" />
                    </>
                )}
            </button>
        </form>
    );
}
