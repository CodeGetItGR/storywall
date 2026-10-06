'use client';

import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { contrastRatio } from '@/lib/adminThemePresets';
import type { EventThemeFontDto } from '@/lib/api/types';
import { eventThemeStyle, isHexColor, themeFontScopeProps } from '@/lib/eventTheme';
import { cn } from '@/lib/utils';

// One radio of the theme picker. "Disabled" is aria-disabled with a no-op click, never the
// disabled attribute: that would drop focus to the body the moment a save starts.
export function ThemePresetOption({
    optionId,
    presetId,
    label,
    backgroundColor,
    illustrationUrl,
    titleColor,
    headingFont,
    selected,
    saving,
    disabled,
    tabbable,
    size = 'default',
    onSelectAction,
    onFocusAction,
}: {
    optionId: string;
    // Null for "No theme"; undefined for the applied theme, which can't be picked again.
    presetId: string | null | undefined;
    label: string;
    backgroundColor: string | null;
    illustrationUrl: string | null;
    titleColor: string | null;
    headingFont: EventThemeFontDto | null;
    selected: boolean;
    saving: boolean;
    disabled: boolean;
    tabbable: boolean;
    size?: 'default' | 'large';
    onSelectAction: (presetId: string | null) => void;
    onFocusAction: (optionId: string) => void;
}) {
    // An illustration that 404s (art replaced by an admin) leaves the colour swatch.
    // Keyed by URL, so a new URL (art replaced, presigned refresh) gets another try.
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const inert = disabled || presetId === undefined;
    const themeStyle = eventThemeStyle(backgroundColor, { titleColor, headingFont });
    // The title colour's contrast was checked against the preset background only, not the white card,
    // so a card with one puts its label on a strip of that background (themeStyle is set only for a
    // valid one). The backend guarantees 3:1, the large-text bar; this ~14px label needs 4.5:1, so
    // below that the strip keeps ink, which the backend guarantees reads on the background.
    const hasStrip = themeStyle !== undefined && titleColor !== null && isHexColor(titleColor);
    const titleOnBackground = hasStrip && contrastRatio(titleColor, backgroundColor!) >= 4.5;

    function handleClick() {
        if (inert) return;
        onSelectAction(presetId);
    }

    function handleFocus() {
        onFocusAction(optionId);
    }

    function handleImageError() {
        setFailedUrl(illustrationUrl);
    }

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={inert}
            data-option-id={optionId}
            tabIndex={tabbable ? 0 : -1}
            onClick={handleClick}
            onFocus={handleFocus}
            className={cn(
                'bg-surface flex min-w-0 flex-col gap-2.5 text-left transition aria-disabled:cursor-not-allowed',
                size === 'large' ? 'rounded-xl p-1.5 pb-2.5' : 'rounded-2xl p-2.5 pb-3',
                selected ? 'ring-2 ring-primary' : 'ring-1 ring-border hover:ring-primary/40',
                disabled && !selected && 'opacity-60',
            )}
        >
            {/* Swatch */}
            <span
                className={cn(
                    'relative block overflow-hidden bg-surface-muted',
                    size === 'large' ? 'aspect-square rounded-lg' : 'aspect-4/3 rounded-xl',
                )}
                style={backgroundColor && isHexColor(backgroundColor) ? { backgroundColor } : undefined}
            >
                {illustrationUrl && failedUrl !== illustrationUrl && (
                    <ProtectedImage
                        src={illustrationUrl}
                        alt=""
                        fill
                        className="object-contain"
                        sizes={size === 'large' ? '(min-width: 640px) 360px, 50vw' : '(min-width: 640px) 240px, 50vw'}
                        loading="lazy"
                        onError={handleImageError}
                    />
                )}
                {saving && (
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/30">
                        <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
                    </span>
                )}
                {selected && !saving && (
                    <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                )}
            </span>
            {/* Label, in the preset's heading font and title colour */}
            {/* An unusable background means no theme at all, font included (EventThemeScope's rule) */}
            <span
                {...themeFontScopeProps(themeStyle ? headingFont : null)}
                style={themeStyle}
                className={cn('min-w-0', hasStrip && 'rounded-md bg-event px-2 py-1')}
            >
                {/* leading-normal leaves room for script fonts and Greek accents under truncate */}
                <span
                    className={cn(
                        'event-heading block truncate text-sm leading-normal font-semibold',
                        !hasStrip && 'px-1',
                        titleOnBackground ? 'text-event-title' : 'text-ink',
                    )}
                >
                    {label}
                </span>
            </span>
        </button>
    );
}
