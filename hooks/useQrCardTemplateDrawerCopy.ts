'use client';

import { useTranslations } from 'next-intl';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { useQrCardTemplateDrawer } from '@/hooks/useQrCardTemplateDrawer';
import { isQrCardDetailError } from '@/lib/adminQrCards';
import { ApiError } from '@/lib/api/client';

type DrawerForm = ReturnType<typeof useQrCardTemplateDrawer>;

// The drawer's error text, worked out from the form state.
export function useQrCardTemplateDrawerCopy(form: DrawerForm) {
    const t = useTranslations('AdminPage.qrCards.drawer');
    const tApi = useTranslations('ApiErrors');
    const apiErrorMessage = useApiErrorMessage();

    // A non-ApiError is fetch failing before any response. Name rejections highlight no field: their
    // localized detail says what's wrong instead.
    let serverError: string | null = null;
    if (form.failure?.kind === 'other') {
        const { error } = form.failure;
        if (!(error instanceof ApiError)) serverError = t('network');
        else if (isQrCardDetailError(error)) serverError = error.problem?.detail?.trim() || tApi('generic');
        else serverError = apiErrorMessage(error);
    }

    return { serverError };
}
