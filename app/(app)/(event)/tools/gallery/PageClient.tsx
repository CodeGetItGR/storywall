'use client';

import { ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { useEventMedia, useUploadMediaBatch } from '@/hooks/useMedia';
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { formatShortDateTime } from '@/lib/datetime';
import { isEventWritable } from '@/lib/eventLifecycle';
import { formatBytes } from '@/lib/format';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useActiveMember } from '@/providers/EventProvider';

const MAX_FILES_PER_BATCH = 10;

export default function GalleryPage() {
    const activeMember = useActiveMember();

    return (
        <EventRouteGate missingEventRedirectTo={routes.welcome}>
            {(context) => <GalleryScreen {...context} activeMember={activeMember} />}
        </EventRouteGate>
    );
}

function GalleryScreen({
    activeEvent,
    activeMember,
    eventId,
    isHost,
}: {
    activeEvent: EventDetailResponseDto;
    activeMember: EventMemberResponseDto | null;
    eventId: string;
    isHost: boolean;
}) {
    const t = useTranslations('GalleryPage');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadNotice, setUploadNotice] = useState<string | null>(null);

    const { data: media = [], isLoading: isLoadingMedia } = useEventMedia(eventId);
    const uploadMediaBatch = useUploadMediaBatch();

    const galleryModule = activeEvent?.modules.find((module) => module.moduleKey === 'gallery');
    const galleryEnabled = galleryModule?.isAvailable ?? false;
    const canUpload = Boolean(eventId && activeMember && galleryEnabled && isEventWritable(activeEvent?.status));
    const selectedSize = useMemo(() => selectedFiles.reduce((sum, file) => sum + file.size, 0), [selectedFiles]);
    const imageMedia = useMemo(() => media.filter((item) => item.mediaType === 'IMAGE'), [media]);

    const handleFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setUploadNotice(null);
        const files = Array.from(event.target.files ?? [])
            .filter((file) => file.type.startsWith('image/'))
            .slice(0, MAX_FILES_PER_BATCH);
        setSelectedFiles(files);
        event.target.value = '';
    }, []);

    const handleClearSelection = useCallback(() => {
        setSelectedFiles([]);
        setUploadNotice(null);
    }, []);

    const handleUpload = useCallback(async () => {
        if (!eventId || !activeMember || selectedFiles.length === 0 || !canUpload) return;

        setUploadNotice(null);
        const result = await uploadMediaBatch.mutateAsync({
            eventId,
            files: selectedFiles,
            mediaType: 'IMAGE',
            uploaderMemberId: activeMember.id,
        });

        setSelectedFiles([]);
        setUploadNotice(t('uploadComplete', { count: result.created.length, failed: result.failed.length }));
    }, [activeMember, canUpload, eventId, selectedFiles, t, uploadMediaBatch]);

    return (
        <div className="mx-auto max-w-5xl px-4 pb-24 lg:pb-8">
            <div className="pt-5 pb-5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    <ImagePlus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {isHost ? t('hostEyebrow') : t('guestEyebrow')}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-ink">{t('title')}</h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">{isHost ? t('hostSubtitle') : t('guestSubtitle')}</p>
            </div>

            {!galleryEnabled && (
                <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-ink-muted shadow-sm">
                    {t('moduleUnavailable')}
                </div>
            )}

            {activeEvent.status === 'FROZEN' && (
                <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm text-sky-700">{t('eventFrozen')}</div>
            )}

            <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-bold text-ink">{t('uploadTitle')}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('uploadHint', { count: MAX_FILES_PER_BATCH })}</p>
                    </div>
                    <label
                        className={cn(
                            'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity',
                            canUpload
                                ? 'bg-gradient-brand text-white hover:opacity-90'
                                : 'cursor-not-allowed bg-surface-muted text-ink-muted opacity-60'
                        )}
                    >
                        <UploadCloud className="h-4 w-4" />
                        {t('choosePhotos')}
                        <input type="file" accept="image/*" multiple disabled={!canUpload} onChange={handleFilesChange} className="sr-only" />
                    </label>
                </div>

                {selectedFiles.length > 0 && (
                    <div className="mt-4 rounded-xl bg-surface-muted/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-ink">
                                {t('selectedSummary', { count: selectedFiles.length, size: formatBytes(selectedSize) })}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleClearSelection}
                                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-card hover:text-ink"
                                >
                                    {t('clear')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpload}
                                    disabled={uploadMediaBatch.isPending}
                                    className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                    {uploadMediaBatch.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {t('upload')}
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {selectedFiles.map((file) => (
                                <span
                                    key={`${file.name}-${file.size}`}
                                    className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-ink-muted"
                                >
                                    {file.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {uploadNotice && <p className="mt-3 text-xs text-ink-muted">{uploadNotice}</p>}
                {uploadMediaBatch.isError && <p className="mt-3 text-xs text-rose-500">{t('uploadFailed')}</p>}
            </section>

            {isHost ? (
                <section>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-ink">{t('libraryTitle')}</p>
                        <p className="text-xs text-ink-muted">{t('photoCount', { count: imageMedia.length })}</p>
                    </div>

                    {isLoadingMedia ? (
                        <div className="flex min-h-48 items-center justify-center rounded-2xl bg-card">
                            <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
                        </div>
                    ) : imageMedia.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center shadow-sm">
                            <ImagePlus className="mx-auto h-8 w-8 text-ink-faint" />
                            <p className="mt-3 text-sm font-semibold text-ink">{t('emptyTitle')}</p>
                            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-muted">{t('emptyBody')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {imageMedia.map((item) => (
                                <a
                                    key={item.id}
                                    href={item.mediaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="relative aspect-square bg-surface-muted">
                                        <Image
                                            src={item.mediaUrl}
                                            alt={item.originalFilename}
                                            fill
                                            sizes="(min-width: 1024px) 25vw, 50vw"
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="px-3 py-2">
                                        <p className="truncate text-xs font-semibold text-ink">{item.originalFilename}</p>
                                        <p className="mt-0.5 text-[11px] text-ink-muted">{formatShortDateTime(item.createdAt)}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <div className="rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-relaxed text-ink-muted shadow-sm">
                    {t('guestSavedForHost')}
                </div>
            )}
        </div>
    );
}
