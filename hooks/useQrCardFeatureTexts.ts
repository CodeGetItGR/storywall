'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { QrCardFeatureTexts } from '@/lib/qrCardFeatures';

// The tiles' labels and sample text in the host's language. The wish and the first song are the scan
// page's own samples, and the schedule rows are the schedule page's own.
export function useQrCardFeatureTexts(): QrCardFeatureTexts {
    const t = useTranslations('QrCardPage.tiles');
    const preview = useTranslations('QrCodePage.preview');
    const schedule = useTranslations('SchedulePage.host');
    return useMemo(
        () => ({
            labels: {
                posts: t('posts'),
                stories: t('stories'),
                wishes: t('wishes'),
                reactions: t('reactions'),
                music: t('music'),
                games: t('games'),
                gifts: t('gifts'),
                schedule: t('schedule'),
            },
            wish: preview('wishText'),
            songs: [preview('songTitle'), t('songTwo'), t('songThree')],
            game: { question: t('gameQuestion'), answers: [t('gameHim'), t('gameHer')] },
            gift: { title: t('giftTitle'), copy: t('giftCopy') },
            schedule: [schedule('sessionManagement.ceremony.title'), schedule('placeholders.title')],
        }),
        [t, preview, schedule],
    );
}
