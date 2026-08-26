'use client';

import { Check, ImagePlus, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpdateEvent } from '@/hooks/useEvent';
import { useUploadMedia } from '@/hooks/useMedia';
import { getFieldErrors } from '@/lib/api/errors';
import type { EventDetailResponseDto, EventPatchDto } from '@/lib/api/types';
import {
    getCurrentDatetimeLocalValue,
    getScheduleDatetimeLocalBounds,
    isDatetimeLocalAfter,
    isDatetimeLocalBefore,
    toDatetimeLocalValue,
} from '@/lib/datetime';
import { getEventEndPresets } from '@/lib/eventEndPresets';

const inputClass =
    'bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'text-xs font-semibold text-ink-muted uppercase tracking-wide';

export default function SettingsTab({
    event,
    canWrite,
    canUploadCover = canWrite,
}: {
    event: EventDetailResponseDto;
    canWrite: boolean;
    canUploadCover?: boolean;
}) {
    const t = useTranslations('ManagePage');
    const tCreateEvent = useTranslations('CreateEventPage');
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();

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
    const coverObjectUrlRef = useRef<string | null>(null);

    const updateEvent = useUpdateEvent(event.id);
    const uploadMedia = useUploadMedia();
    const fieldErrors = getFieldErrors(updateEvent.error);
    const nowAt = getCurrentDatetimeLocalValue();
    const eventHasStarted = Boolean(event.schedule.startAt && isDatetimeLocalBefore(toDatetimeLocalValue(event.schedule.startAt), nowAt));
    const { startAtMin, startAtMax, endAtMin } = getScheduleDatetimeLocalBounds({ startAt, endAt });
    const endAtPresets = React.useMemo(() => getEventEndPresets(event.eventType, startAt), [event.eventType, startAt]);
    const scheduleError =
        !eventHasStarted && startAt && isDatetimeLocalBefore(startAt, startAtMin)
            ? t('settings.validation.startInPast')
            : startAt && endAt && !isDatetimeLocalAfter(endAt, startAt)
              ? t('settings.validation.endBeforeStart')
              : null;
    const maxDescriptionLength = appConfig?.contentLimits.eventDescriptionMaxLength ?? 2000;

    useEffect(() => {
        return () => {
            if (coverObjectUrlRef.current) {
                URL.revokeObjectURL(coverObjectUrlRef.current);
            }
        };
    }, []);

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (!canUploadCover) return;
        const file = e.target.files?.[0];
        if (!file) return;
        if (coverObjectUrlRef.current) {
            URL.revokeObjectURL(coverObjectUrlRef.current);
        }
        const nextPreviewUrl = URL.createObjectURL(file);
        coverObjectUrlRef.current = nextPreviewUrl;
        setCoverPreview(nextPreviewUrl);
        setSaved(false);
        uploadMedia.mutate({ eventId: event.id, file }, { onSuccess: (media) => setPendingCoverMediaId(media.id) });
    }

    function handleRemovePendingCover() {
        if (!canUploadCover) return;
        if (coverObjectUrlRef.current) {
            URL.revokeObjectURL(coverObjectUrlRef.current);
            coverObjectUrlRef.current = null;
        }
        setPendingCoverMediaId(null);
        setCoverPreview(event.coverMedia?.mediaUrl ?? null);
    }

    function handleChangeCoverClick() {
        if (!canUploadCover) return;
        fileRef.current?.click();
    }

    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setTitle(e.target.value);
    }

    function handleSubtitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSubtitle(e.target.value);
    }

    function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setDescription(e.target.value.slice(0, maxDescriptionLength));
    }

    function handleLocationNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLocationName(e.target.value);
    }

    function handleLocationAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLocationAddress(e.target.value);
    }

    function handleMapsUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMapsUrl(e.target.value);
    }

    function handleStartAtChange(e: React.ChangeEvent<HTMLInputElement>) {
        setStartAt(e.target.value);
    }

    function handleEndAtChange(e: React.ChangeEvent<HTMLInputElement>) {
        setEndAt(e.target.value);
    }

    function handleEndAtPresetClick(e: React.MouseEvent<HTMLButtonElement>) {
        const value = e.currentTarget.dataset.value;
        if (value) setEndAt(value);
    }

    function handleRsvpDeadlineChange(e: React.ChangeEvent<HTMLInputElement>) {
        setRsvpDeadline(e.target.value);
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!canWrite) return;
        if (scheduleError) return;
        setSaved(false);

        const patch: EventPatchDto = {};
        if (title.trim() !== initial.title) patch.title = title.trim();
        if (subtitle.trim() !== initial.subtitle) patch.subtitle = subtitle.trim();
        if (description.trim() !== initial.description) patch.description = description.trim();
        if (locationName.trim() !== initial.locationName) patch.locationName = locationName.trim();
        if (locationAddress.trim() !== initial.locationAddress) patch.locationAddress = locationAddress.trim();
        if (mapsUrl.trim() !== initial.mapsUrl) patch.mapsUrl = mapsUrl.trim();
        if (rsvpDeadline && rsvpDeadline !== initial.rsvpDeadline) patch.rsvpDeadline = new Date(rsvpDeadline).toISOString();
        if (!eventHasStarted && startAt && startAt !== initial.startAt) patch.startAt = new Date(startAt).toISOString();
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
    const disabled = !canWrite;

    return (
        <div>
            <p className="text-sm text-ink-muted mb-5">{t('settings.subtitle')}</p>
            {!canWrite && (
                <p className="mb-5 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('settings.readOnly')}</p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <span className={labelClass}>{t('settings.coverPhoto.label')}</span>
                    <div className="mt-1.5">
                        {coverPreview ? (
                            <div className="relative rounded-2xl overflow-hidden aspect-21/9 bg-surface-muted">
                                <Image src={coverPreview} alt="" fill className="object-cover" sizes="700px" loading="lazy" />
                                {isUploading && (
                                    <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleChangeCoverClick}
                                        disabled={disabled || !canUploadCover}
                                        className="px-3 py-1.5 rounded-full bg-ink/60 text-white text-xs font-semibold hover:bg-ink/80 transition-colors"
                                    >
                                        {t('settings.coverPhoto.change')}
                                    </button>
                                    {pendingCoverMediaId && (
                                        <button
                                            type="button"
                                            onClick={handleRemovePendingCover}
                                            disabled={disabled}
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
                                onClick={handleChangeCoverClick}
                                disabled={disabled || !canUploadCover}
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
                            disabled={disabled || !canUploadCover}
                            aria-label={t('settings.coverPhoto.upload')}
                        />
                    </div>
                </div>

                <FormFieldLabel label={t('settings.fields.title')} required labelClassName={labelClass}>
                    <input type="text" required value={title} onChange={handleTitleChange} disabled={disabled} className={inputClass} />
                    {fieldErrors?.title && <span className="text-xs text-rose-500">{fieldErrors.title}</span>}
                </FormFieldLabel>

                <FormFieldLabel label={t('settings.fields.description')} optional labelClassName={labelClass}>
                    <textarea
                        value={description}
                        onChange={handleDescriptionChange}
                        disabled={disabled}
                        placeholder={t('settings.placeholders.description')}
                        rows={4}
                        maxLength={maxDescriptionLength}
                        className={`${inputClass} resize-none leading-relaxed`}
                    />
                    <span className="text-right text-xs text-ink-faint">
                        {description.length}/{maxDescriptionLength}
                    </span>
                </FormFieldLabel>

                <div className="grid gap-3 sm:grid-cols-2">
                    <FormFieldLabel label={t('settings.fields.locationName')} optional labelClassName={labelClass}>
                        <input type="text" value={locationName} onChange={handleLocationNameChange} disabled={disabled} className={inputClass} />
                    </FormFieldLabel>
                    <FormFieldLabel label={t('settings.fields.locationAddress')} optional labelClassName={labelClass}>
                        <input
                            type="text"
                            value={locationAddress}
                            onChange={handleLocationAddressChange}
                            disabled={disabled}
                            placeholder={t('settings.placeholders.locationAddress')}
                            className={inputClass}
                        />
                    </FormFieldLabel>
                </div>

                <FormFieldLabel label={t('settings.fields.mapsUrl')} optional labelClassName={labelClass}>
                    <input
                        type="url"
                        value={mapsUrl}
                        onChange={handleMapsUrlChange}
                        disabled={disabled}
                        placeholder={t('settings.placeholders.mapsUrl')}
                        className={inputClass}
                    />
                </FormFieldLabel>

                {/* Schedule */}
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormFieldLabel label={t('settings.fields.startAt')} required labelClassName={labelClass}>
                        <input
                            type="datetime-local"
                            required
                            value={startAt}
                            onChange={handleStartAtChange}
                            disabled={disabled || eventHasStarted}
                            min={startAtMin}
                            max={startAtMax}
                            className={inputClass}
                        />
                        {eventHasStarted && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('settings.startLocked')}</p>}
                    </FormFieldLabel>
                    <FormFieldLabel label={t('settings.fields.endAt')} optional labelClassName={labelClass}>
                        <input
                            type="datetime-local"
                            value={endAt}
                            onChange={handleEndAtChange}
                            disabled={disabled}
                            min={endAtMin}
                            className={inputClass}
                        />
                        {/* End Presets */}
                        <div className="flex flex-wrap gap-1.5">
                            {endAtPresets.map((preset) => (
                                <button
                                    key={preset.key}
                                    type="button"
                                    data-value={preset.value ?? undefined}
                                    disabled={disabled || !preset.value}
                                    onClick={handleEndAtPresetClick}
                                    className="rounded-full bg-surface-muted/70 px-2.5 py-1 text-[11px] font-medium text-ink-muted transition hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {tCreateEvent(`endAtPresets.${preset.labelKey}`)}
                                </button>
                            ))}
                        </div>
                    </FormFieldLabel>
                </div>
                {scheduleError && <p className="text-xs text-rose-500">{scheduleError}</p>}

                <FormFieldLabel label={t('settings.fields.rsvpDeadline')} optional labelClassName={labelClass}>
                    <input
                        type="datetime-local"
                        value={rsvpDeadline}
                        onChange={handleRsvpDeadlineChange}
                        disabled={disabled}
                        className={inputClass}
                    />
                </FormFieldLabel>

                {updateEvent.isError && !fieldErrors && <p className="text-xs text-rose-500">{toErrorMessage(updateEvent.error)}</p>}

                {/* Actions */}
                <div className="flex items-center gap-3 mt-1">
                    <button
                        type="submit"
                        disabled={disabled || isSaving || isUploading || !title.trim() || !startAt || Boolean(scheduleError)}
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
