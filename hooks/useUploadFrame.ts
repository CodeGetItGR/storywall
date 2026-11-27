'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import type { UploadFrame } from '@/lib/api/types';
import {
    FRAME_PREVIEW_SIZE,
    frameSvg,
    frameSvgDataUrl,
    frameText,
    readFrameChoice,
    saveFrameChoice,
    subscribeFrameChoice,
    type UploadFrameControl,
} from '@/lib/uploadFrame';
import { framePhotosForUpload } from '@/lib/uploadImageResize';
import { getUploadLimits } from '@/lib/uploadLimits';

// The event a gallery upload goes to, as far as the frame needs it.
export type UploadFrameSource = {
    eventId: string;
    frame?: UploadFrame | null;
    title?: string | null;
    startAt?: string | null;
    timezone?: string | null;
};

// Add frame (KAN-304): the switch, when the event has a frame, and the step every gallery upload runs on its
// files before sending them.
export function useUploadFrame(source: UploadFrameSource | null) {
    const t = useTranslations('UploadFrame');
    const tAlt = useTranslations('ImageAlt');
    const locale = useLocale();
    const { data: appConfig } = useAppConfig();
    const { imageMaxDimension } = getUploadLimits(appConfig?.media);

    const eventId = source?.eventId ?? null;
    const design = source?.frame && source.frame !== 'NONE' ? source.frame : null;
    const title = source?.title ?? null;
    const startAt = source?.startAt ?? null;
    const timezone = source?.timezone ?? null;

    // Off on the server and on the first paint; the visit's choice once the browser has it.
    const on = useSyncExternalStore(
        subscribeFrameChoice,
        () => (eventId ? readFrameChoice(eventId) : false),
        () => false,
    );
    const toggle = useCallback(() => {
        if (eventId) saveFrameChoice(eventId, !readFrameChoice(eventId));
    }, [eventId]);

    const text = useMemo(() => frameText({ title, startAt, timezone }, locale), [locale, startAt, timezone, title]);
    const previewSrc = useMemo(() => (design ? frameSvgDataUrl(frameSvg(design, FRAME_PREVIEW_SIZE, text)) : null), [design, text]);

    const prepare = useCallback(
        async (files: File[]): Promise<{ files: File[]; notice: string | null }> => {
            if (!design || !on) return { files, notice: null };
            const framed = await framePhotosForUpload(files, design, text, imageMaxDimension);
            return { files: framed.files, notice: framed.unframed > 0 ? t('unframed') : null };
        },
        [design, imageMaxDimension, on, t, text],
    );

    const control: UploadFrameControl | null = useMemo(
        () => (design && previewSrc ? { on, toggle, previewSrc, label: t('add'), alt: tAlt('uploadFramePreview') } : null),
        [design, on, previewSrc, t, tAlt, toggle],
    );

    return { control, prepare };
}
