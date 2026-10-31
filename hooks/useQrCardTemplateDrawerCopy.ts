'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { useQrCardTemplateDrawer } from '@/hooks/useQrCardTemplateDrawer';
import { isQrCardDetailError, MIN_CODE_CONTRAST } from '@/lib/adminQrCards';
import { formatContrastRatio, type ThemeFontOption } from '@/lib/adminThemePresets';
import { ApiError } from '@/lib/api/client';

const FONT_OPTION_LABEL_KEYS = { live: 'headingFontOption', archived: 'headingFontArchived', noFile: 'headingFontNoFile' } as const;

type DrawerForm = ReturnType<typeof useQrCardTemplateDrawer>;

// The drawer's hints and error text, worked out from the form state.
export function useQrCardTemplateDrawerCopy(form: DrawerForm) {
    const t = useTranslations('AdminPage.qrCards.drawer');
    const tApi = useTranslations('ApiErrors');
    const locale = useLocale();
    const apiErrorMessage = useApiErrorMessage();

    // Floored like the server's ratio, so a colour just under the minimum never reads as passing. Once a
    // save is blocked, the alert replaces the hint.
    let codeHint: string | undefined;
    if (form.errors.codeColor) codeHint = t('codeColorInvalid');
    else if (form.codeContrastRatio !== null && !form.errors.codeContrast) {
        const ratio = formatContrastRatio(form.codeContrastRatio, locale);
        codeHint =
            form.codeContrastRatio < MIN_CODE_CONTRAST
                ? t('codeContrastLow', { ratio, min: new Intl.NumberFormat(locale).format(MIN_CODE_CONTRAST) })
                : t('codeContrastOk', { ratio });
    }

    const fontHint = form.fontsStatus === 'loading' ? t('headingFontLoading') : form.fontsStatus === 'error' ? t('headingFontLoadFailed') : undefined;
    const fontLabel = (option: ThemeFontOption) => t(FONT_OPTION_LABEL_KEYS[option.status], { familyName: option.familyName, key: option.key });

    // A non-ApiError is fetch failing before any response. Contrast, artwork size and name rejections
    // highlight no field: their localized detail says what's wrong instead.
    let serverError: string | null = null;
    if (form.failure?.kind === 'other') {
        const { error } = form.failure;
        if (!(error instanceof ApiError)) serverError = t('network');
        else if (isQrCardDetailError(error)) serverError = error.problem?.detail?.trim() || tApi('generic');
        else serverError = apiErrorMessage(error);
    }

    let artworkHint = form.hasPendingFile ? t('artworkPending') : t('artworkHint');
    if (form.fileError === 'type') artworkHint = t('artworkType');
    if (form.fileError === 'size') artworkHint = t('artworkSize');

    return { codeHint, fontHint, fontLabel, serverError, artworkHint };
}
