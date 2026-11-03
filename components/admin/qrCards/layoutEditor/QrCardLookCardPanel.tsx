'use client';

import { ImagePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField } from '@/components/admin/AdminField';
import { QrCardLookColorField } from '@/components/admin/qrCards/layoutEditor/QrCardLookColorField';
import type { QrCardLookState } from '@/hooks/useQrCardLook';
import { THEME_ILLUSTRATION_ACCEPT } from '@/lib/adminThemePresets';

// What the card as a whole changes, shown while nothing on it is selected: its artwork and text colour.
export function QrCardLookCardPanel({ look, artworkHint }: { look: QrCardLookState; artworkHint: string }) {
    const t = useTranslations('AdminPage.qrCards.drawer');

    return (
        <div className="space-y-4">
            {/* Artwork */}
            <AdminField label={t('artwork')} hint={artworkHint}>
                <label className="relative inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink focus-within:ring-2 focus-within:ring-primary/20 hover:bg-canvas">
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {t('artworkChoose')}
                    <input type="file" accept={THEME_ILLUSTRATION_ACCEPT} onChange={look.handleFileChange} className="sr-only" />
                </label>
            </AdminField>

            {/* Text colour */}
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
        </div>
    );
}
