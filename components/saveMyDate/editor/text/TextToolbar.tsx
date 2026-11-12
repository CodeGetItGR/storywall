'use client';

import { Bold, Italic, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type RefObject, useRef } from 'react';

import { TextAddMenu } from '@/components/saveMyDate/editor/text/TextAddMenu';
import { TextAlignButtons } from '@/components/saveMyDate/editor/text/TextAlignButtons';
import { TextColorPicker } from '@/components/saveMyDate/editor/text/TextColorPicker';
import { TextFontPicker } from '@/components/saveMyDate/editor/text/TextFontPicker';
import { TextToolbarButton } from '@/components/saveMyDate/editor/text/TextToolbarButton';
import { TextToolbarSelect } from '@/components/saveMyDate/editor/text/TextToolbarSelect';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { MD_MEDIA_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import type { TextToolbarState } from '@/hooks/useTextToolbar';
import { useTextToolbarPlacement } from '@/hooks/useTextToolbarPlacement';
import { LINE_HEIGHTS } from '@/lib/invitation/textEditing';
import { cn } from '@/lib/utils';

type TextToolbarProps = {
    toolbar: TextToolbarState;
    // The text being edited, which the toolbar floats over on a computer.
    anchor: HTMLElement | null;
    canAdd: boolean;
    onDelete: () => void;
    // The editor keeps it, so the keyboard can move from the text to the toolbar.
    toolbarRef?: RefObject<HTMLDivElement | null>;
    onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

const Divider = () => <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-white/12" />;

// Everything that styles the text being edited. It floats over the text on a computer and
// docks at the bottom, above the keyboard, on a phone.
export function TextToolbar({ toolbar, anchor, canAdd, onDelete, toolbarRef, onKeyDown }: TextToolbarProps) {
    const t = useTranslations('InvitationEditor');
    const ownRef = useRef<HTMLDivElement>(null);
    const ref = toolbarRef ?? ownRef;
    const docked = !useMediaQuery(MD_MEDIA_QUERY);
    const keyboardInset = useKeyboardInset();
    useTextToolbarPlacement(anchor, ref, docked, keyboardInset);

    return (
        <div
            ref={ref}
            role="toolbar"
            aria-label={t('textTools')}
            onKeyDown={onKeyDown}
            data-docked={docked || undefined}
            style={docked ? { bottom: keyboardInset } : undefined}
            className={cn(
                'smd-editor fixed z-30 flex flex-col gap-1 rounded-[14px] border border-(--smd-editor-line) bg-(--smd-editor-bar) p-1.5 text-(--smd-editor-text) shadow-[0_12px_32px_rgba(0,0,0,0.42)] backdrop-blur-md',
                docked ? 'inset-x-2 mb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'top-0 left-0 max-w-[calc(100vw-16px)]',
            )}
        >
            {/* Follows the event */}
            {toolbar.followsEvent && (
                <p className="max-w-90 px-1.5 pt-0.5 text-[12px] leading-snug text-(--smd-editor-muted)">{t('sectionSettings.followEventHint')}</p>
            )}

            {/* Tools */}
            <div className="flex items-center gap-1 overflow-x-auto">
                {/* Font and size */}
                <TextFontPicker value={toolbar.font} label={toolbar.fontLabel} options={toolbar.fonts} onChange={toolbar.setFont} />
                <TextToolbarSelect label={t('fontSize')} value={toolbar.size ? String(toolbar.size) : ''} onChange={toolbar.setSize}>
                    {toolbar.sizes.map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </TextToolbarSelect>

                {/* Colour */}
                <TextColorPicker value={toolbar.color} swatches={toolbar.swatches} onPick={toolbar.pickColor} />
                <Divider />

                {/* Weight and slant */}
                <TextToolbarButton label={t('bold')} pressed={toolbar.bold} onClick={toolbar.toggleBold}>
                    <Bold aria-hidden="true" />
                </TextToolbarButton>
                <TextToolbarButton label={t('italic')} pressed={toolbar.italic} onClick={toolbar.toggleItalic}>
                    <Italic aria-hidden="true" />
                </TextToolbarButton>
                <Divider />

                {/* Alignment and line spacing */}
                <TextAlignButtons value={toolbar.align} onChange={toolbar.setAlign} />
                <TextToolbarSelect
                    label={t('lineHeight')}
                    value={toolbar.lineHeight ? String(toolbar.lineHeight) : ''}
                    onChange={toolbar.setLineHeight}
                >
                    <option value="">{t('lineHeightDefault')}</option>
                    {LINE_HEIGHTS.map((height) => (
                        <option key={height} value={height}>
                            {height}
                        </option>
                    ))}
                </TextToolbarSelect>
                <Divider />

                {/* Add and delete */}
                <TextAddMenu disabled={!canAdd} onAdd={toolbar.add} />
                <TextToolbarButton label={t('deleteText')} onClick={onDelete} className="text-rose-300">
                    <Trash2 aria-hidden="true" />
                </TextToolbarButton>
            </div>
        </div>
    );
}
