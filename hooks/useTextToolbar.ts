'use client';

import { type ChangeEvent, useCallback, useMemo } from 'react';

import type { InlineTextEdit } from '@/hooks/useInlineTextEdit';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { TextStyle } from '@/lib/invitation/primitives';
import {
    type ColorScope,
    fontOptions,
    sameFont,
    textColorSwatches,
    type TextRole,
    textSizeOptions,
    THEME_FONT,
} from '@/lib/invitation/textEditing';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type Align = NonNullable<TextStyle['align']>;

// What the text shows when it has no setting of its own: the page's own look.
type Shown = { size?: number; italic: boolean; bold: boolean; color?: string };

function rgbToHex(rgb: string): string | undefined {
    const parts = rgb.match(/\d+(\.\d+)?/g);
    if (!parts || parts.length < 3) return undefined;
    return `#${parts
        .slice(0, 3)
        .map((part) => Math.round(Number(part)).toString(16).padStart(2, '0'))
        .join('')}`;
}

function readShown(element: HTMLElement | null): Shown {
    if (!element) return { italic: false, bold: false };
    const css = getComputedStyle(element);
    const size = Math.round(parseFloat(css.fontSize));
    return {
        size: Number.isFinite(size) && size > 0 ? size : undefined,
        italic: css.fontStyle === 'italic',
        bold: Number(css.fontWeight) >= 600,
        color: rgbToHex(css.color),
    };
}

// The text toolbar's values for the text being edited, and what each control does to it.
export function useTextToolbar(edit: InlineTextEdit, document: InvitationDocument, theme: ThemeDesign, uploadedFonts: InvitationFontDto[] = []) {
    const { snapshot, element, setStyle, applyColor, addText } = edit;
    const style: TextStyle = useMemo(() => snapshot?.style ?? {}, [snapshot]);
    // Read after the page drew the text; the style changes above redraw it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const shown = useMemo(() => readShown(element), [element, style]);

    const fonts = useMemo(() => fontOptions(document, theme, uploadedFonts), [document, theme, uploadedFonts]);
    const swatches = useMemo(() => textColorSwatches(document, theme), [document, theme]);
    const size = style.size ?? shown.size;
    const sizes = useMemo(() => textSizeOptions(size), [size]);
    const font = style.font && style.font !== THEME_FONT ? style.font : THEME_FONT;
    const fontLabel = font === THEME_FONT ? undefined : (fonts.find((option) => sameFont(option.value, font))?.label ?? font);

    const setFont = useCallback((value: string) => setStyle({ font: value === THEME_FONT ? undefined : value }), [setStyle]);
    const setSize = useCallback((event: ChangeEvent<HTMLSelectElement>) => setStyle({ size: Number(event.target.value) }), [setStyle]);
    const setLineHeight = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => setStyle({ lineHeight: event.target.value ? Number(event.target.value) : undefined }),
        [setStyle],
    );
    const bold = style.bold ?? shown.bold;
    const italic = style.italic ?? shown.italic;
    const toggleBold = useCallback(() => setStyle({ bold: !bold }), [bold, setStyle]);
    const toggleItalic = useCallback(() => setStyle({ italic: !italic }), [italic, setStyle]);
    const setAlign = useCallback((align: Align) => setStyle({ align }), [setStyle]);
    const pickColor = useCallback((color: string, scope: ColorScope) => applyColor(color, scope), [applyColor]);
    const add = useCallback((role: TextRole) => addText(role), [addText]);

    return {
        font,
        fontLabel,
        fonts,
        size,
        sizes,
        color: style.color ?? shown.color ?? theme.colors.text,
        swatches,
        bold,
        italic,
        align: style.align ?? 'center',
        lineHeight: style.lineHeight,
        setFont,
        setSize,
        setLineHeight,
        toggleBold,
        toggleItalic,
        setAlign,
        pickColor,
        add,
    };
}

export type TextToolbarState = ReturnType<typeof useTextToolbar>;
