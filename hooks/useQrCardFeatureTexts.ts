'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { QrCardFeatureTexts } from '@/lib/qrCardFeatures';

// The tiles' labels and sample text in the host's language. The wish and the first song are the scan
// page's own samples.
export function useQrCardFeatureTexts(): QrCardFeatureTexts {
    const t = useTranslations('QrCardPage.tiles');
    const preview = useTranslations('QrCodePage.preview');
    return useMemo(
        () => ({
            labels: { posts: t('posts'), stories: t('stories'), wishes: t('wishes'), reactions: t('reactions'), music: t('music') },
            wish: preview('wishText'),
            songs: [preview('songTitle'), t('songTwo'), t('songThree')],
        }),
        [t, preview],
    );
}
