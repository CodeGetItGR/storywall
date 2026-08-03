'use client';

import { Check, ImagePlus, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import type { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import { useUpdateEvent } from '@/hooks/useEvent';
import { useUploadMedia } from '@/hooks/useMedia';
import { getErrorMessage, getFieldErrors } from '@/lib/api/errors';
import type { EventDetailResponseDto, EventPatchDto } from '@/lib/api/types';

const inputClass =
    'bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition';
const labelClass = 'text-xs font-semibold text-ink-muted uppercase tracking-wide';

function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SettingsTab({ t, event }: { t: ReturnType<typeof useTranslations>; event: EventDetailResponseDto }) {
    const initial = {
        title: event.title,
        subtitle: event.subtitle ?? '',
        description: event.description ?? '',
        locationName: event.location.name ?? '',
        locationAddress: event.location.address ?? '',
        mapsUrl: event.location.mapsUrl ?? '',
        rsvpDeadline: toDatetimeLocalValue(event.schedule.rsvpDeadline),
        startAt: toDatetimeLocalValue(event.schedule.startAt),
        endAt: toDatetimeLocalValue(event.schedule.endAt),
    };

    const [title, setTitle] = useState(initial.title);
    const [subtitle, setSubtitle] = useState(initial.subtitle);
    const [description, setDescription] = useState(initial.description);
    const [locationName, setLocationName] = useState(initial.locationName);
    const [locationAddress, setLocationAddress] = useState(initial.locationAddress);
    const [mapsUrl, setMapsUrl] = useState(initial.mapsUrl);
    const [rsvpDeadline, setRsvpDeadline] = useState(initial.rsvpDeadline);
    const [startAt, setStartAt] = useState(initial.startAt);
    const [endAt, setEndAt] = useState(initial.endAt);

    const [coverPreview, setCoverPreview] = useState<string | null>(event.coverMedia?.mediaUrl ?? null);
    const [pendingCoverMediaId, setPendingCoverMediaId] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const updateEvent = useUpdateEvent(event.id);
    const uploadMedia = useUploadMedia();
    const fieldErrors = getFieldErrors(updateEvent.error);

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverPreview(URL.createObjectURL(file));
        setSaved(false);
        uploadMedia.mutate({ eventId: event.id, file, mediaType: 'IMAGE' }, { onSuccess: (media) => setPendingCoverMediaId(media.id) });
    }

    function handleRemovePendingCover() {
        setPendingCoverMediaId(null);
        setCoverPreview(event.coverMedia?.mediaUrl ?? null);
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaved(false);

        const patch: EventPatchDto = {};
        if (title.trim() !== initial.title) patch.title = title.trim();
        if (subtitle.trim() !== initial.subtitle) patch.subtitle = subtitle.trim();
        if (description.trim() !== initial.description) patch.description = description.trim();
        if (locationName.trim() !== initial.locationName) patch.locationName = locationName.trim();
        if (locationAddress.trim() !== initial.locationAddress) patch.locationAddress = locationAddress.trim();
        if (mapsUrl.trim() !== initial.mapsUrl) patch.mapsUrl = mapsUrl.trim();
        if (rsvpDeadline && rsvpDeadline !== initial.rsvpDeadline) patch.rsvpDeadline = new Date(rsvpDeadline).toISOString();
        if (startAt && startAt !== initial.startAt) patch.startAt = new Date(startAt).toISOString();
        if (endAt && endAt !== initial.endAt) patch.endAt = new Date(endAt).toISOString();
        if (pendingCoverMediaId) patch.coverMediaId = pendingCoverMediaId;

        if (Object.keys(patch).length === 0) return;

        try {
            await updateEvent.mutateAsync(patch);
            setPendingCoverMediaId(null);
            setSaved(true);
        } catch {
            // error surfaced inline below
        }
    }

    const isUploading = uploadMedia.isPending;
    const isSaving = updateEvent.isPending;

    return (
        <div className="px-4">
            <p className="text-sm text-ink-muted mb-5">{t('settings.subtitle')}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <span className={labelClass}>{t('settings.coverPhoto.label')}</span>
                    <div className="mt-1.5">
                        {coverPreview ? (
                            <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-surface-muted">
                                <Image src={coverPreview} alt="" fill className="object-cover" sizes="700px" />
                                {isUploading && (
                                    <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        className="px-3 py-1.5 rounded-full bg-ink/60 text-white text-xs font-semibold hover:bg-ink/80 transition-colors"
                                    >
                                        {t('settings.coverPhoto.change')}
                                    </button>
                                    {pendingCoverMediaId && (
                                        <button
                                            type="button"
                                            onClick={handleRemovePendingCover}
                                            aria-label={t('settings.coverPhoto.remove')}
                                            className="w-8 h-8 rounded-full bg-ink/60 flex items-center justify-center text-white hover:bg-ink/80 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-10 text-ink-faint hover:border-primary/40 hover:text-primary/60 hover:bg-primary-light/30 transition-colors"
                            >
                                <ImagePlus className="w-7 h-7" />
                                <span className="text-sm font-medium">{t('settings.coverPhoto.upload')}</span>
                                <span className="text-xs">{t('settings.coverPhoto.formats')}</span>
                            </button>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleFile}
                            aria-label={t('settings.coverPhoto.upload')}
                        />
                    </div>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>{t('settings.fields.title')}</span>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                    {fieldErrors?.title && <span className="text-xs text-rose-500">{fieldErrors.title}</span>}
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>{t('settings.fields.subtitle')}</span>
                    <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder={t('settings.placeholders.subtitle')}
                        className={inputClass}
                    />
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>{t('settings.fields.description')}</span>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('settings.placeholders.description')}
                        rows={4}
                        className={`${inputClass} resize-none leading-relaxed`}
                    />
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className={labelClass}>{t('settings.fields.locationName')}</span>
                        <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} className={inputClass} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className={labelClass}>{t('settings.fields.locationAddress')}</span>
                        <input
                            type="text"
                            value={locationAddress}
                            onChange={(e) => setLocationAddress(e.target.value)}
                            placeholder={t('settings.placeholders.locationAddress')}
                            className={inputClass}
                        />
                    </label>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>{t('settings.fields.mapsUrl')}</span>
                    <input
                        type="url"
                        value={mapsUrl}
                        onChange={(e) => setMapsUrl(e.target.value)}
                        placeholder={t('settings.placeholders.mapsUrl')}
                        className={inputClass}
                    />
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className={labelClass}>{t('settings.fields.startAt')}</span>
                        <input type="datetime-local" required value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputClass} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className={labelClass}>{t('settings.fields.endAt')}</span>
                        <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputClass} />
                    </label>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>{t('settings.fields.rsvpDeadline')}</span>
                    <input type="datetime-local" value={rsvpDeadline} onChange={(e) => setRsvpDeadline(e.target.value)} className={inputClass} />
                </label>

                {updateEvent.isError && !fieldErrors && <p className="text-xs text-rose-500">{getErrorMessage(updateEvent.error)}</p>}

                <div className="flex items-center gap-3 mt-1">
                    <button
                        type="submit"
                        disabled={isSaving || isUploading || !title.trim() || !startAt}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.save')}
                    </button>
                    {saved && !isSaving && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                            {t('settings.saved')}
                        </span>
                    )}
                </div>
            </form>
        </div>
    );
}
