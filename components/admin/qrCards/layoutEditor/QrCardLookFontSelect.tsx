'use client';

import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import type { QrCardLookState } from '@/hooks/useQrCardLook';
import type { ThemeFontOption } from '@/lib/adminThemePresets';

// The title's font: one of the theme fonts, or the card's own.
export function QrCardLookFontSelect({
    look,
    fontHint,
    fontLabel,
}: {
    look: QrCardLookState;
    fontHint?: string;
    fontLabel: (option: ThemeFontOption) => string;
}) {
    const t = useTranslations('AdminPage.qrCards.drawer');

    return (
        <div className="space-y-1">
            <AdminField label={t('headingFont')} hint={fontHint}>
                <select name="headingFontId" value={look.draft.headingFontId} onChange={look.handleChange} className={adminInputClass()}>
                    <option value="">{t('headingFontDefault')}</option>
                    {look.fontOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                            {fontLabel(option)}
                        </option>
                    ))}
                </select>
            </AdminField>
            {look.fontsStatus === 'ready' && !look.hasUsableFonts && <p className="text-[11px] leading-4 text-ink-faint">{t('headingFontEmpty')}</p>}
        </div>
    );
}
