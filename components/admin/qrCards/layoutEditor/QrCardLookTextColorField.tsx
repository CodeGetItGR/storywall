'use client';

import { useTranslations } from 'next-intl';

import { QrCardLookColorField } from '@/components/admin/qrCards/layoutEditor/QrCardLookColorField';
import type { QrCardLookState } from '@/hooks/useQrCardLook';

// The colour of the title and the scan lines: shown for the card, the title and the lines.
export function QrCardLookTextColorField({ look }: { look: QrCardLookState }) {
    const t = useTranslations('AdminPage.qrCards.drawer');

    return (
        <QrCardLookColorField
            name="textColor"
            label={t('textColor')}
            hexLabel={t('textColorHex')}
            value={look.draft.textColor}
            swatchValue={look.textColorInputValue}
            hint={look.errors.textColor ? t('textColorInvalid') : undefined}
            invalid={Boolean(look.errors.textColor)}
            onChangeAction={look.handleChange}
        />
    );
}
