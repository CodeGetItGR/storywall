'use client';

import { Bold, Italic, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type RefObject, useRef } from 'react';

import { EventLockNote } from '@/components/saveMyDate/editor/EventLockNote';
import { TextAddMenu } from '@/components/saveMyDate/editor/text/TextAddMenu';
import { TextColorPicker } from '@/components/saveMyDate/editor/text/TextColorPicker';
import { TextStyleMenu } from '@/components/saveMyDate/editor/text/TextStyleMenu';
import { TextToolbarButton } from '@/components/saveMyDate/editor/text/TextToolbarButton';
import { TextToolbarSelect } from '@/components/saveMyDate/editor/text/TextToolbarSelect';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { MD_MEDIA_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import type { TextToolbarState } from '@/hooks/useTextToolbar';
import { useTextToolbarPlacement } from '@/hooks/useTextToolbarPlacement';
import type { TextStylePresetDto } from '@/lib/api/types';
import type { ColorScope } from '@/lib/invitation/textEditing';
import { cn } from '@/lib/utils';

type FeedTextToolbarProps = {
    toolbar: TextToolbarState;
    anchor: HTMLElement | null;
    canAdd: boolean;
    // The admin's Style presets (useTextStylePresets), in the admins' order.
    presets: TextStylePresetDto[];
    // The text being edited: the Style menu draws each preset on its start.
    text: string;
    onPreset: (preset: TextStylePresetDto) => void;
    onAddLink: () => void;
    onDelete: () => void;
    toolbarRef?: RefObject<HTMLDivElement | null>;
    onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

const COLOR_SCOPES: ColorScope[] = ['text'];
const Divider = () => <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-white/12" />;

// The feed's text toolbar (spec item 9): +, Style, size, colour (this text only), bold, italic, delete. No font,
// alignment or line spacing: on the feed every text is centred and its font comes from its Style. It floats over the
// text on a computer and docks above the keyboard on a phone, as the invitation editor's does.
export function FeedTextToolbar({ toolbar, anchor, canAdd, presets, text, onPreset, onAddLink, onDelete, toolbarRef, onKeyDown }: FeedTextToolbarProps) {
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
            {/* From the event */}
            {toolbar.lock && <EventLockNote source={toolbar.lock} href={toolbar.lockHref} className="max-w-90 px-1.5 pt-0.5" />}

            {/* Tools */}
            <div className="-m-1.5 flex items-center gap-1 overflow-x-auto p-1.5">
                {/* Add */}
                <TextAddMenu disabled={!canAdd} onAdd={toolbar.add} onAddLink={onAddLink} />
                <Divider />

                {/* Style and size */}
                <TextStyleMenu presets={presets} text={text} onPick={onPreset} />
                <TextToolbarSelect label={t('fontSize')} value={toolbar.size ? String(toolbar.size) : ''} onChange={toolbar.setSize}>
                    {toolbar.sizes.map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </TextToolbarSelect>

                {/* Colour: this text only (the block's droplet colours all of them) */}
                <TextColorPicker value={toolbar.color} swatches={toolbar.swatches} onPick={toolbar.pickColor} scopes={COLOR_SCOPES} />
                <Divider />

                {/* Weight and slant */}
                <TextToolbarButton label={t('bold')} pressed={toolbar.bold} onClick={toolbar.toggleBold}>
                    <Bold aria-hidden="true" />
                </TextToolbarButton>
                <TextToolbarButton label={t('italic')} pressed={toolbar.italic} onClick={toolbar.toggleItalic}>
                    <Italic aria-hidden="true" />
                </TextToolbarButton>

                {/* Delete */}
                {!toolbar.lock && (
                    <>
                        <Divider />
                        <TextToolbarButton label={t('deleteText')} onClick={onDelete} className="text-rose-300">
                            <Trash2 aria-hidden="true" />
                        </TextToolbarButton>
                    </>
                )}
            </div>
        </div>
    );
}
