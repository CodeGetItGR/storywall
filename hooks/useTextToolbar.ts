'use client';

import { type ChangeEvent, useCallback, useMemo } from 'react';

import type { InlineTextEdit } from '@/hooks/useInlineTextEdit';
import { useShownTextStyle } from '@/hooks/useShownTextStyle';
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

// The text toolbar's values for the text being edited, and what each control does to it.
export function useTextToolbar(edit: InlineTextEdit, document: InvitationDocument, theme: ThemeDesign, uploadedFonts: InvitationFontDto[] = []) {
    const { snapshot, element, setStyle, applyColor, addText } = edit;
    const style: TextStyle = useMemo(() => snapshot?.style ?? {}, [snapshot]);
    const shown = useShownTextStyle(element);

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
