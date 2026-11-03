'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { QrCardLookState } from '@/hooks/useQrCardLook';
import { MIN_CODE_CONTRAST } from '@/lib/adminQrCards';
import { formatContrastRatio, type ThemeFontOption } from '@/lib/adminThemePresets';

const FONT_OPTION_LABEL_KEYS = { live: 'headingFontOption', archived: 'headingFontArchived', noFile: 'headingFontNoFile' } as const;

// The look settings' hints, worked out from their state.
export function useQrCardLookCopy(look: QrCardLookState) {
    const t = useTranslations('AdminPage.qrCards.drawer');
    const locale = useLocale();

    // Floored like the server's ratio, so a colour just under the minimum never reads as passing. Once a
    // save is blocked, the alert replaces the hint.
    let codeHint: string | undefined;
    if (look.errors.codeColor) codeHint = t('codeColorInvalid');
    else if (look.codeContrastRatio !== null && !look.errors.codeContrast) {
        const ratio = formatContrastRatio(look.codeContrastRatio, locale);
        codeHint =
            look.codeContrastRatio < MIN_CODE_CONTRAST
                ? t('codeContrastLow', { ratio, min: new Intl.NumberFormat(locale).format(MIN_CODE_CONTRAST) })
                : t('codeContrastOk', { ratio });
    }

    const fontHint = look.fontsStatus === 'loading' ? t('headingFontLoading') : look.fontsStatus === 'error' ? t('headingFontLoadFailed') : undefined;
    const fontLabel = (option: ThemeFontOption) => t(FONT_OPTION_LABEL_KEYS[option.status], { familyName: option.familyName, key: option.key });

    let artworkHint = look.file ? t('artworkPending') : t('artworkHint');
    if (look.fileError === 'type') artworkHint = t('artworkType');
    if (look.fileError === 'size') artworkHint = t('artworkSize');

    return { codeHint, fontHint, fontLabel, artworkHint };
}
