'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Images, Loader2, UserRound, Video, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useId, useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { UploadFrameSwitch } from '@/components/gallery/UploadFrameSwitch';
import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { SignupAcceptanceCheckbox } from '@/components/legal/SignupAcceptanceCheckbox';
import { QrSentArt } from '@/components/qrGuest/QrSentArt';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { communityGuidelinesQueryKey, useCommunityGuidelinesVersion } from '@/hooks/useCommunityGuidelinesVersion';
import { useFilePreviews } from '@/hooks/useFilePreviews';
import { useUploadMediaBatch } from '@/hooks/useMedia';
import { useUploadQrMediaBatch } from '@/hooks/useQrMediaUpload';
import { useSlowUpload } from '@/hooks/useSlowUpload';
import { termsVersionQueryKey, useTermsVersion } from '@/hooks/useTermsVersion';
import { useUploadAccept } from '@/hooks/useUploadAccept';
import { type UploadFrameSource, useUploadFrame } from '@/hooks/useUploadFrame';
import { isGuidelinesVersionMismatchError, isTermsVersionMismatchError } from '@/lib/api/errors';
import { formatBytes } from '@/lib/format';
import { INCIDENT_MODE } from '@/lib/incident';
import { getUploadLimits } from '@/lib/uploadLimits';
import { cn } from '@/lib/utils';

interface AnonymousQrMediaUploadFormProps {
    token: string;
    // A signed-in member of the event uploads as themselves: their name, their account's acceptance.
    member?: { eventId: string; displayName: string } | null;
    // Told when the sent screen shows or hides, so the page can drop its own header there.
    onSentChange?: (sent: boolean) => void;
    // The event's frame, when it has one: Add frame shows above the upload button (KAN-304).
    frameSource?: UploadFrameSource | null;
}

export function AnonymousQrMediaUploadForm({ token, member = null, onSentChange, frameSource = null }: AnonymousQrMediaUploadFormProps) {
    const t = useTranslations('QrCodePage');
    const tAlt = useTranslations('ImageAlt');
    const uploadAccept = useUploadAccept();
    const toErrorMessage = useApiErrorMessage();
    const qrUploadBatch = useUploadQrMediaBatch();
    const memberUploadBatch = useUploadMediaBatch();
    const uploadBatch = member ? memberUploadBatch : qrUploadBatch;
    const isSlow = useSlowUpload(uploadBatch.isPending);
    const queryClient = useQueryClient();
    const termsVersion = useTermsVersion();
    const guidelinesVersion = useCommunityGuidelinesVersion();
    const { data: appConfig } = useAppConfig();
    const { imageBytes, videoBytes } = getUploadLimits(appConfig?.media);

    const [uploaderName, setUploaderName] = useState('');
    // No account here, so the 16+ confirmation and the acceptance are asked on every upload (legal todo #3),
    // in one box as at sign-up. A member already gave both with their account.
    const [acceptedDocuments, setAcceptedDocuments] = useState(false);
    const isAccepted = Boolean(member) || acceptedDocuments;
    const [files, setFiles] = useState<File[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const previews = useFilePreviews(files);
    const uploadFrame = useUploadFrame(frameSource);
    const [isFraming, setIsFraming] = useState(false);
    const [frameNotice, setFrameNotice] = useState<string | null>(null);
    const nameHintId = useId();
    const pickerLabel = files.length > 0 ? t('anonymousUpload.addMore') : t('anonymousUpload.chooseFiles');

    useEffect(() => {
        onSentChange?.(done);
    }, [done, onSentChange]);

    const handleUploaderNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setUploaderName(e.target.value);
    }, []);

    // Back to an empty form for the next set. The name stays; the box is ticked again, as on every upload.
    const handleUploadMore = useCallback(() => {
        setAcceptedDocuments(false);
        setSubmitError(null);
        setFrameNotice(null);
        setDone(false);
    }, []);

    const handleAcceptedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setAcceptedDocuments(e.target.checked);
    }, []);

    // A file over its own cap is refused here rather than sent to be refused.
    const addFiles = useCallback(
        (added: File[]) => {
            const isTooLarge = (file: File) => file.size > (file.type.startsWith('video/') ? videoBytes : imageBytes);
            setSubmitError(
                added.some(isTooLarge)
                    ? t('anonymousUpload.filesTooLarge', { imageSize: formatBytes(imageBytes), videoSize: formatBytes(videoBytes) })
                    : null,
            );
            setFiles((prev) => [...prev, ...added.filter((file) => !isTooLarge(file))]);
        },
        [imageBytes, videoBytes, t],
    );

    const handleFilesChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            addFiles(e.target.files ? Array.from(e.target.files) : []);
            e.target.value = '';
        },
        [addFiles],
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragActive(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            setIsDragActive(false);
            addFiles(Array.from(e.dataTransfer.files));
        },
        [addFiles],
    );

    const handleRemoveFileClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-index]');
        if (!target) return;
        const index = Number(target.dataset.removeIndex);
        setFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (files.length === 0 || !isAccepted) return;
        if (!member && (!termsVersion.data || !guidelinesVersion.data)) {
            setSubmitError(t('anonymousUpload.acceptanceUnavailable'));
            return;
        }

        setSubmitError(null);
        setIsFraming(true);
        let prepared: { files: File[]; notice: string | null };
        try {
            prepared = await uploadFrame.prepare(files);
        } finally {
            setIsFraming(false);
        }
        setFrameNotice(prepared.notice);
        try {
            const result = member
                ? await memberUploadBatch.mutateAsync({ eventId: member.eventId, files: prepared.files, onBusy: setIsBusy })
                : await qrUploadBatch.mutateAsync({
                      token,
                      files: prepared.files,
                      uploaderName: uploaderName.trim() || undefined,
                      acceptance: { termsVersion: termsVersion.data!, guidelinesVersion: guidelinesVersion.data! },
                      onBusy: setIsBusy,
                  });
            // The batch answers 200 whatever happened to each file. Keep the refused ones to try again.
            if (result.failed.length > 0) {
                const refused = new Set(result.failed.map((failure) => failure.filename));
                setFiles((prev) => prev.filter((file) => refused.has(file.name)));
                setSubmitError(
                    result.failed.some((failure) => failure.errorCode === 'RATE_LIMITED')
                        ? t('anonymousUpload.rateLimited')
                        : t('anonymousUpload.someFailed', { count: result.failed.length }),
                );
                return;
            }
            setDone(true);
            setFiles([]);
        } catch (err) {
            // A newer version went live while the page was open: fetch both and make them tick again.
            if (isTermsVersionMismatchError(err) || isGuidelinesVersionMismatchError(err)) {
                setAcceptedDocuments(false);
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: termsVersionQueryKey }),
                    queryClient.invalidateQueries({ queryKey: communityGuidelinesQueryKey }),
                ]);
                setSubmitError(t('anonymousUpload.acceptanceChanged'));
                return;
            }
            setSubmitError(toErrorMessage(err));
        }
    }

    if (done) {
        return (
            /* Sent */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
                <QrSentArt kind="upload" />
                <p className="text-base font-semibold text-ink">{t('anonymousUpload.success')}</p>
                {frameNotice && <p className="text-sm text-ink-muted">{frameNotice}</p>}
                <button
                    type="button"
                    onClick={handleUploadMore}
                    className="inline-flex min-h-10 items-center rounded-full bg-surface-muted px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-80"
                >
                    {t('anonymousUpload.uploadMore')}
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Incident note */}
            <IncidentPausedNote />

            {/* Files: a dashed tile to pick from, the picked files in a strip under it, then where they go */}
            <div className="flex flex-col gap-3">
                <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        'flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-[1.25rem] border-2 border-dashed px-4 py-5 text-center transition-colors',
                        isDragActive ? 'border-primary/60 bg-primary/10' : 'border-primary/30 bg-primary/[0.04] hover:bg-primary/[0.07]',
                        INCIDENT_MODE && 'pointer-events-none opacity-60',
                    )}
                >
                    <span className="mb-1.5 flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-xs">
                        <Image src="/icons/camera.svg" alt={pickerLabel} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
                    </span>
                    <span className="text-[15px] font-semibold text-ink">{pickerLabel}</span>
                    <span className="text-[13px] text-ink-muted">{t('anonymousUpload.filesLabel')}</span>
                    <span className="hidden text-xs text-ink-faint md:block">{t('anonymousUpload.dropHint')}</span>
                    <input
                        type="file"
                        accept={uploadAccept.media}
                        multiple
                        disabled={INCIDENT_MODE}
                        onChange={handleFilesChange}
                        className="hidden"
                    />
                </label>

                {previews.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto" onClick={handleRemoveFileClick}>
                        {previews.map((preview, index) => (
                            <div
                                key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
                                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-muted"
                            >
                                {preview.isVideo ? (
                                    <>
                                        <video src={preview.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                                        <Video className="absolute bottom-1 left-1 h-3.5 w-3.5 text-white drop-shadow" aria-hidden="true" />
                                    </>
                                ) : (
                                    <ProtectedImage
                                        src={preview.url}
                                        alt={tAlt('photoPreview')}
                                        fill
                                        className="object-cover"
                                        sizes="80px"
                                        unoptimized
                                    />
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

                {/* Where uploads go */}
                <p className="flex gap-2 text-xs leading-relaxed text-ink-muted">
                    <Images className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {t('anonymousUpload.galleryOnlyNote')}
                </p>
            </div>

            {/* Name: a member's own, read-only */}
            <div>
                <FormFieldLabel
                    label={t('anonymousUpload.nameLabel')}
                    optional={!member}
                    labelClassName="text-sm font-semibold tracking-normal text-ink normal-case"
                    indicatorClassName="text-xs"
                >
                    <span
                        className={cn(
                            'flex items-center gap-2.5 rounded-[1rem] border border-border px-4 transition-shadow',
                            member
                                ? 'bg-ink/[0.03]'
                                : 'bg-background focus-within:border-primary/40 focus-within:ring-3 focus-within:ring-primary/15',
                        )}
                    >
                        <UserRound className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <input
                            type="text"
                            maxLength={100}
                            value={member ? member.displayName : uploaderName}
                            onChange={handleUploaderNameChange}
                            readOnly={Boolean(member)}
                            aria-describedby={member ? undefined : nameHintId}
                            className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink outline-none read-only:text-ink-muted"
                        />
                    </span>
                </FormFieldLabel>
                {!member && (
                    <p id={nameHintId} className="mt-1.5 text-xs text-ink-muted">
                        {t('anonymousUpload.namePlaceholder')}
                    </p>
                )}
            </div>

            {/* Acceptance: guests only */}
            {!member && <SignupAcceptanceCheckbox minimumAge={16} checked={acceptedDocuments} onChangeAction={handleAcceptedChange} />}

            {/* Status */}
            {isBusy ? (
                <p role="status" className="-mt-1 text-center text-xs text-ink-muted">
                    {t('anonymousUpload.uploadBusy')}
                </p>
            ) : isSlow ? (
                <p role="status" className="-mt-1 text-center text-xs text-ink-muted">
                    {t('anonymousUpload.uploadSlow')}
                </p>
            ) : (
                submitError && (
                    <p role="alert" className="-mt-1 text-center text-xs text-red-500">
                        {submitError}
                    </p>
                )
            )}

            {/* Frame */}
            {uploadFrame.control && <UploadFrameSwitch control={uploadFrame.control} />}

            {/* Upload */}
            <button
                type="submit"
                disabled={INCIDENT_MODE || uploadBatch.isPending || isFraming || files.length === 0 || !isAccepted}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {uploadBatch.isPending || isFraming ? (
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
