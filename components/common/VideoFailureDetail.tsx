'use client';

import { useTranslations } from 'next-intl';

import type { MediaMetadata } from '@/lib/api/types';
import { videoFailureReason } from '@/lib/videoFailure';

/** Why a FAILED video failed, under the generic "couldn't be processed" line; nothing for an unknown reason. */
export function VideoFailureDetail({ metadata }: { metadata: MediaMetadata | null | undefined }) {
    const t = useTranslations('VideoFailure');
    const reason = videoFailureReason(metadata);
    return reason ? <p className="text-xs font-normal">{t(reason)}</p> : null;
}
