'use client';

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { QrCardLayoutRange } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutRange';
import { QrCardLayoutSegmented } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutSegmented';
import type { QrCardLayoutEditorState } from '@/hooks/useQrCardLayoutEditor';
import { formatMm } from '@/lib/adminQrCards';
import type { QrCardTextAlign } from '@/lib/api/types';
import { elementRect, QR_CARD_LAYOUT_LIMITS } from '@/lib/qrCardLayout';

const ALIGN_ICONS = {
    left: <AlignLeft className="h-4 w-4" aria-hidden="true" />,
    center: <AlignCenter className="h-4 w-4" aria-hidden="true" />,
    right: <AlignRight className="h-4 w-4" aria-hidden="true" />,
};
const ALIGNMENTS: QrCardTextAlign[] = ['left', 'center', 'right'];

// The side panel: what the selected element can change.
export function QrCardLayoutInspector({ editor }: { editor: QrCardLayoutEditorState }) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const locale = useLocale();
    const { selected, layout } = editor;

    if (!selected) return <p className="text-sm text-ink-muted">{t('selectHint')}</p>;

    const rect = elementRect(layout, selected);
    const alignOptions = ALIGNMENTS.map((value) => ({ value, label: t(`alignOptions.${value}`), icon: ALIGN_ICONS[value] }));

    return (
        <div className="space-y-5">
            {/* Heading */}
            <div className="space-y-1">
                <h3 className="text-sm font-bold text-ink">{t(`elements.${selected}`)}</h3>
                <p className="font-mono text-xs text-ink-muted">
                    {t('position', {
                        x: formatMm(rect.x, locale),
                        y: formatMm(rect.y, locale),
                        width: formatMm(rect.width, locale),
                        height: formatMm(rect.height, locale),
                    })}
                </p>
            </div>

            {/* Title */}
            {selected === 'title' && (
                <>
                    <QrCardLayoutSegmented
                        name="title-align"
                        legend={t('align')}
                        value={layout.title.align}
                        options={alignOptions}
                        onChangeAction={editor.handleTitleAlignChange}
                    />
                    <QrCardLayoutRange
                        label={t('titleSize')}
                        value={layout.title.maxSize}
                        min={QR_CARD_LAYOUT_LIMITS.titleMaxSize.min}
                        max={QR_CARD_LAYOUT_LIMITS.titleMaxSize.max}
                        onChangeAction={editor.handleTitleSizeChange}
                    />
                </>
            )}

            {/* Lines */}
            {selected === 'lines' && (
                <>
                    <QrCardLayoutSegmented
                        name="lines-align"
                        legend={t('align')}
                        value={layout.lines.align}
                        options={alignOptions}
                        onChangeAction={editor.handleLinesAlignChange}
                    />
                    <QrCardLayoutRange
                        label={t('linesSize')}
                        value={layout.lines.textSize}
                        min={QR_CARD_LAYOUT_LIMITS.linesTextSize.min}
                        max={QR_CARD_LAYOUT_LIMITS.linesTextSize.max}
                        onChangeAction={editor.handleLinesSizeChange}
                    />
                </>
            )}

            {/* Code */}
            {selected === 'code' && (
                <>
                    <div className="space-y-1.5">
                        <AdminSwitch label={t('panel')} checked={layout.code.panel} onCheckedChangeAction={editor.handlePanelChange} />
                        {!layout.code.panel && <p className="text-[11px] leading-4 text-status-warn">{t('panelOffNote')}</p>}
                    </div>
                    <QrCardLayoutRange
                        label={t('radius')}
                        value={layout.code.radius}
                        min={QR_CARD_LAYOUT_LIMITS.radius.min}
                        max={QR_CARD_LAYOUT_LIMITS.radius.max}
                        disabled={!layout.code.panel}
                        onChangeAction={editor.handleRadiusChange}
                    />
                </>
            )}
        </div>
    );
}
