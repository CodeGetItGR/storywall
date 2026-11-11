'use client';

import { useCallback, useMemo } from 'react';

import { useInvitationTypographyPresets } from '@/hooks/useInvitationTypographyPresets';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { fontOptions, sameFont } from '@/lib/invitation/textEditing';
import type { ThemeDesign } from '@/lib/invitation/theme';
import {
    applyTypographyPreset,
    type BackgroundMode,
    type BackgroundSlot,
    DEFAULT_BUTTON_TEXT,
    setThemeFont,
} from '@/lib/invitation/themeEditing';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

export type ThemeColor = 'primary' | 'secondary' | 'text' | 'buttonBg' | 'buttonText';
export type ThemeFontSlot = 'title' | 'body' | 'button';

type ThemeStyleOptions = {
    store: InvitationEditorStore;
    design: ThemeDesign;
    document: InvitationDocument;
    eventType: string;
    uploadedFonts?: InvitationFontDto[];
};

// The theme's own look in the admin's theme editor (old wedartOpenThemeStyle): colours,
// background modes, font pairing and fonts, photo shape and buttons. Every change is an
// undo step; dragging a colour is one.
export function useThemeStyle({ store, design, document, eventType, uploadedFonts }: ThemeStyleOptions) {
    const presets = useInvitationTypographyPresets(eventType);
    const presetList = useMemo(() => presets.data ?? [], [presets.data]);
    const fonts = useMemo(() => fontOptions(document, design, uploadedFonts), [design, document, uploadedFonts]);

    const setColor = useCallback(
        (key: ThemeColor, color: string) =>
            store.getState().editTheme((theme) => {
                theme.colors[key] = color;
            }, `theme.color.${key}`),
        [store],
    );

    // A button colour of its own goes; the button follows the main colour again.
    const resetColor = useCallback(
        (key: 'buttonBg' | 'buttonText') =>
            store.getState().editTheme((theme) => {
                delete theme.colors[key];
            }),
        [store],
    );

    const setBackgroundMode = useCallback(
        (slot: BackgroundSlot, mode: BackgroundMode) =>
            store.getState().editTheme((theme) => {
                theme.backgrounds[slot].mode = mode;
            }),
        [store],
    );

    const setStableRepeat = useCallback(
        (slot: BackgroundSlot, stable: boolean) =>
            store.getState().editTheme((theme) => {
                theme.backgrounds[slot].stableRepeat = stable;
            }),
        [store],
    );

    // '' is Custom: the fonts stay, the pairing goes.
    const choosePreset = useCallback(
        (id: string) => {
            const preset = presetList.find((item) => item.id === id);
            store.getState().editTheme((theme, draftDocument) => {
                if (preset) applyTypographyPreset(theme, draftDocument, preset);
                else delete theme.typographyPresetId;
            });
        },
        [presetList, store],
    );

    const setFont = useCallback(
        (slot: ThemeFontSlot, font: string) =>
            store.getState().editTheme((theme) => {
                setThemeFont(theme, slot, font);
            }),
        [store],
    );

    const setPhotoShape = useCallback(
        (shape: ThemeDesign['photoShape']) =>
            store.getState().editTheme((theme) => {
                theme.photoShape = shape;
            }),
        [store],
    );

    const setAutoContrast = useCallback(
        (on: boolean) =>
            store.getState().editTheme((theme) => {
                theme.autoTextContrast = on;
            }),
        [store],
    );

    // The listed value for a theme font, which may be written differently in the theme.
    const fontValue = (font: string | undefined) => (font ? (fonts.find((option) => sameFont(option.value, font))?.value ?? font) : '');

    return {
        design,
        fontValues: { title: fontValue(design.fonts.title), body: fontValue(design.fonts.body), button: fontValue(design.fonts.button) },
        // Shown when a button has no colour of its own.
        buttonBgShown: design.colors.buttonBg ?? design.colors.primary,
        buttonTextShown: design.colors.buttonText ?? DEFAULT_BUTTON_TEXT,
        presets: presetList,
        // A pairing that is no longer offered reads as Custom.
        presetId: presetList.some((preset) => preset.id === design.typographyPresetId) ? (design.typographyPresetId ?? '') : '',
        fonts,
        setColor,
        resetColor,
        setBackgroundMode,
        setStableRepeat,
        choosePreset,
        setFont,
        setPhotoShape,
        setAutoContrast,
    };
}

export type ThemeStyle = ReturnType<typeof useThemeStyle>;
