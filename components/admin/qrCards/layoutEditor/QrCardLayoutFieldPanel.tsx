'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { QrCardLayoutRange } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutRange';
import { QrCardLayoutSegmented } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutSegmented';
import type { QrCardLayoutEditorState } from '@/hooks/useQrCardLayoutEditor';
import type { QrCardFieldFont, QrCardTextAlign } from '@/lib/api/types';
import { QR_CARD_LAYOUT_LIMITS, type QrCardTextField } from '@/lib/qrCardLayout';

const FONTS: QrCardFieldFont[] = ['heading', 'body'];
const LOCALES = ['en', 'el'] as const;
const COPY_KEYS = { text: 'fieldText', label: 'fieldLabel', placeholder: 'fieldPlaceholder' } as const;

// One added field's settings: its words in both languages, then how it looks.
export function QrCardLayoutFieldPanel({
    editor,
    field,
    alignOptions,
}: {
    editor: QrCardLayoutEditorState;
    field: QrCardTextField;
    alignOptions: Array<{ value: QrCardTextAlign; label: string; icon: ReactNode }>;
}) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const parts = field.kind === 'fixed' ? (['text'] as const) : (['label', 'placeholder'] as const);

    return (
        <>
            {/* Words */}
            <div className="space-y-3">
                {parts.flatMap((part) =>
                    LOCALES.map((locale) => (
                        <AdminField key={`${part}.${locale}`} label={t(`${COPY_KEYS[part]}.${locale}`)} optional={part === 'placeholder'}>
                            <input
                                name={`${part}.${locale}`}
                                value={field[part]?.[locale] ?? ''}
                                onChange={editor.handleFieldTextChange}
                                maxLength={QR_CARD_LAYOUT_LIMITS.fieldText}
                                autoComplete="off"
                                className={adminInputClass()}
                            />
                        </AdminField>
                    )),
                )}
            </div>

            {/* Look */}
            <QrCardLayoutSegmented
                name="field-align"
                legend={t('align')}
                value={field.align}
                options={alignOptions}
                onChangeAction={editor.handleFieldAlignChange}
            />
            <QrCardLayoutRange
                label={t('titleSize')}
                value={field.textSize}
                min={QR_CARD_LAYOUT_LIMITS.fieldTextSize.min}
                max={QR_CARD_LAYOUT_LIMITS.fieldTextSize.max}
                onChangeAction={editor.handleFieldSizeChange}
            />
            <QrCardLayoutSegmented
                name="field-font"
                legend={t('font')}
                value={field.font}
                options={FONTS.map((value) => ({ value, label: t(`fontOptions.${value}`) }))}
                onChangeAction={editor.handleFieldFontChange}
            />
            <AdminSwitch label={t('bold')} checked={field.bold} onCheckedChangeAction={editor.handleFieldBoldChange} />
            <label className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('color')}</span>
                <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-muted">{field.color}</span>
                    <input
                        type="color"
                        value={field.color.toLowerCase()}
                        onChange={editor.handleFieldColorChange}
                        className="h-8 w-10 cursor-pointer rounded-md border border-border bg-white p-1"
                    />
                </span>
            </label>
        </>
    );
}
