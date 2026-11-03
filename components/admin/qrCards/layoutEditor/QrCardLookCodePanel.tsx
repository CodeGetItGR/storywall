'use client';

import { useTranslations } from 'next-intl';

import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { QrCardLookColorField } from '@/components/admin/qrCards/layoutEditor/QrCardLookColorField';
import type { QrCardLookState } from '@/hooks/useQrCardLook';

// The code's colour, with its contrast on the white panel, and the logo in its middle.
export function QrCardLookCodePanel({ look, codeHint }: { look: QrCardLookState; codeHint?: string }) {
    const t = useTranslations('AdminPage.qrCards.drawer');

    return (
        <div className="space-y-4">
            {/* Colour */}
            <QrCardLookColorField
                name="codeColor"
                label={t('codeColor')}
                hexLabel={t('codeColorHex')}
                value={look.draft.codeColor}
                swatchValue={look.codeColorInputValue}
                hint={codeHint}
                hintLive={false}
                invalid={Boolean(look.errors.codeColor || look.errors.codeContrast)}
                onChangeAction={look.handleChange}
            >
                {look.errors.codeContrast && (
                    <span role="alert" className="text-[11px] leading-4 font-semibold text-status-danger">
                        {t('codeContrastInvalid')}
                    </span>
                )}
            </QrCardLookColorField>

            {/* Logo */}
            <AdminSwitch label={t('centerLogo')} checked={look.draft.centerLogo} onCheckedChangeAction={look.handleCenterLogoChange} />
        </div>
    );
}
