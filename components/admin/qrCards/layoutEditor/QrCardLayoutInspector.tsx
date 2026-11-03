'use client';

import { AlignCenter, AlignLeft, AlignRight, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { QrCardLayoutAddBar } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutAddBar';
import { QrCardLayoutFieldPanel } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutFieldPanel';
import { QrCardLayoutRange } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutRange';
import { QrCardLayoutSegmented } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutSegmented';
import { QrCardLineWordingPanel } from '@/components/admin/qrCards/layoutEditor/QrCardLineWordingPanel';
import { QrCardLookCardPanel } from '@/components/admin/qrCards/layoutEditor/QrCardLookCardPanel';
import { QrCardLookCodePanel } from '@/components/admin/qrCards/layoutEditor/QrCardLookCodePanel';
import { QrCardLookFontSelect } from '@/components/admin/qrCards/layoutEditor/QrCardLookFontSelect';
import { QrCardLookTextColorField } from '@/components/admin/qrCards/layoutEditor/QrCardLookTextColorField';
import type { QrCardLayoutEditorState } from '@/hooks/useQrCardLayoutEditor';
import type { QrCardLookState } from '@/hooks/useQrCardLook';
import { useQrCardLookCopy } from '@/hooks/useQrCardLookCopy';
import { formatMm } from '@/lib/adminQrCards';
import type { QrCardTextAlign } from '@/lib/api/types';
import { elementName, elementRect, QR_CARD_LAYOUT_LIMITS } from '@/lib/qrCardLayout';

const ALIGN_ICONS = {
    left: <AlignLeft className="h-4 w-4" aria-hidden="true" />,
    center: <AlignCenter className="h-4 w-4" aria-hidden="true" />,
    right: <AlignRight className="h-4 w-4" aria-hidden="true" />,
};
const ALIGNMENTS: QrCardTextAlign[] = ['left', 'center', 'right'];

// The side panel: adding text, then what the selected element can change, or the card itself while
// nothing is selected.
export function QrCardLayoutInspector({ editor, look }: { editor: QrCardLayoutEditorState; look: QrCardLookState }) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const locale = useLocale();
    const copy = useQrCardLookCopy(look);
    const { selected, selectedField, layout } = editor;
    const alignOptions = ALIGNMENTS.map((value) => ({ value, label: t(`alignOptions.${value}`), icon: ALIGN_ICONS[value] }));
    const rect = selected ? elementRect(layout, selected) : null;
    const name = selected ? elementName(layout, selected) : null;

    return (
        <div className="space-y-6">
            {/* Add */}
            <QrCardLayoutAddBar editor={editor} />

            {/* Card */}
            {!selected && (
                <div className="space-y-5">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-ink">{t('elements.card')}</h3>
                        <p className="text-sm text-ink-muted">{t('selectHint')}</p>
                    </div>
                    <QrCardLookCardPanel look={look} artworkHint={copy.artworkHint} />
                </div>
            )}

            {selected && rect && name && (
                <div className="space-y-5">
                    {/* Heading */}
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-ink">{t(`elements.${name.key}`, { number: name.number })}</h3>
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
                    {selected === 'title' && layout.title && (
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
                            <QrCardLookFontSelect look={look} fontHint={copy.fontHint} fontLabel={copy.fontLabel} />
                            <QrCardLookTextColorField look={look} />
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
                            <QrCardLookTextColorField look={look} />
                            <QrCardLineWordingPanel editor={editor} />
                        </>
                    )}

                    {/* Code */}
                    {selected === 'code' && (
                        <>
                            <QrCardLookCodePanel look={look} codeHint={copy.codeHint} />
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

                    {/* Field */}
                    {selectedField && <QrCardLayoutFieldPanel editor={editor} field={selectedField} alignOptions={alignOptions} />}

                    {/* Remove */}
                    {(selected === 'title' || selectedField) && (
                        <button
                            type="button"
                            onClick={editor.removeSelected}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-status-danger hover:bg-status-danger/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {selected === 'title' ? t('removeTitle') : t('removeField')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
