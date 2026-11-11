'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { ThemeStyle } from '@/hooks/useThemeStyle';
import { PHOTO_SHAPES, type ThemeDesign } from '@/lib/invitation/theme';

// The style panel's lists and one-argument handlers, so its rows stay plain.
export function useThemeStyleControls(style: ThemeStyle) {
    const t = useTranslations('InvitationEditor.themeStyle');
    const { setColor, resetColor, setFont, setPhotoShape: setShape, presets, fonts } = style;

    const presetOptions = useMemo(
        () => [{ value: '', label: t('customFonts') }, ...presets.map((preset) => ({ value: preset.id, label: preset.name }))],
        [presets, t],
    );
    const fontOptions = useMemo(() => fonts.map((font) => ({ value: font.value, label: font.label })), [fonts]);
    const buttonFontOptions = useMemo(() => [{ value: '', label: t('sameAsBody') }, ...fontOptions], [fontOptions, t]);
    const shapeOptions = useMemo(() => PHOTO_SHAPES.map((shape) => ({ value: shape, label: t(`shapes.${shape}`) })), [t]);

    return {
        presetOptions,
        fontOptions,
        buttonFontOptions,
        shapeOptions,
        setPrimary: useCallback((color: string) => setColor('primary', color), [setColor]),
        setSecondary: useCallback((color: string) => setColor('secondary', color), [setColor]),
        setText: useCallback((color: string) => setColor('text', color), [setColor]),
        setButtonBg: useCallback((color: string) => setColor('buttonBg', color), [setColor]),
        setButtonText: useCallback((color: string) => setColor('buttonText', color), [setColor]),
        resetButtonBg: useCallback(() => resetColor('buttonBg'), [resetColor]),
        resetButtonText: useCallback(() => resetColor('buttonText'), [resetColor]),
        setTitleFont: useCallback((font: string) => setFont('title', font), [setFont]),
        setBodyFont: useCallback((font: string) => setFont('body', font), [setFont]),
        setButtonFont: useCallback((font: string) => setFont('button', font), [setFont]),
        setPhotoShape: useCallback((shape: string) => setShape(shape as ThemeDesign['photoShape']), [setShape]),
    };
}
