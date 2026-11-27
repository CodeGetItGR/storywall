'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUpdateEvent } from '@/hooks/useEvent';
import type { EventDetailResponseDto, UploadFrame } from '@/lib/api/types';
import { isEventDeleted, isEventWritable } from '@/lib/eventLifecycle';
import { FRAME_PREVIEW_SIZE, frameSvg, frameSvgDataUrl, frameText, UPLOAD_FRAME_OPTIONS } from '@/lib/uploadFrame';

// The host's Photo frame (KAN-304): which design guests may add to their photos, or none. Graduations only for now.
export function useGalleryFrameSetting(event: EventDetailResponseDto | null, isHost: boolean) {
    const t = useTranslations('UploadFrame');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const update = useUpdateEvent(event?.id ?? null);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const current: UploadFrame = event?.uploadFrame ?? 'NONE';
    const title = event?.title ?? null;
    const startAt = event?.schedule.startAt ?? null;
    const timezone = event?.schedule.timezone ?? null;
    const options = useMemo(() => {
        const text = frameText({ title, startAt, timezone }, locale);
        return UPLOAD_FRAME_OPTIONS.map((frame) => ({
            frame,
            label: frame === 'NONE' ? t('none') : t(`designs.${frame}`),
            previewSrc: frame === 'NONE' ? null : frameSvgDataUrl(frameSvg(frame, FRAME_PREVIEW_SIZE, text)),
        }));
    }, [locale, startAt, t, timezone, title]);

    const openSheet = useCallback(() => {
        setError(null);
        setOpen(true);
    }, []);
    const close = useCallback(() => setOpen(false), []);
    const choose = useCallback(
        async (frame: UploadFrame) => {
            if (frame === current) {
                setOpen(false);
                return;
            }
            setError(null);
            try {
                await update.mutateAsync({ uploadFrame: frame });
                setOpen(false);
            } catch (failure) {
                setError(toErrorMessage(failure));
            }
        },
        [current, toErrorMessage, update],
    );

    const shown = Boolean(event) && isHost && event?.eventType === 'GRADUATION' && isEventWritable(event.status) && !isEventDeleted(event);
    if (!shown) return null;
    return {
        label: t('setting'),
        value: options.find((option) => option.frame === current)?.label ?? t('none'),
        options,
        current,
        open,
        openSheet,
        close,
        choose,
        saving: update.isPending,
        error,
    };
}

export type GalleryFrameSetting = NonNullable<ReturnType<typeof useGalleryFrameSetting>>;
