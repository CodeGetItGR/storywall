'use client';

import { Check, Loader2, Lock } from 'lucide-react';
import { useId, useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { EventThemeFontDto } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';
import { themeCardTitleLook } from '@/lib/feedThemes';
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
    titleFontFamily = null,
    locked = false,
    lockedLabel,
    selected,
    saving,
    disabled,
    tabbable,
    size = 'default',
    onDark = false,
    previewTitle,
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
    // A Save my date theme's title font; the title uses it instead of headingFont.
    titleFontFamily?: string | null;
    locked?: boolean;
    // The lock's hover text and screen-reader description.
    lockedLabel?: string;
    selected: boolean;
    saving: boolean;
    disabled: boolean;
    tabbable: boolean;
    size?: 'default' | 'large';
    // A white card, for a dark surface.
    onDark?: boolean;
    // The event's title, shown in the theme's font as a preview; the theme name then goes below it.
    previewTitle?: string;
    onSelectAction: (presetId: string | null) => void;
    onFocusAction: (optionId: string) => void;
}) {
    // An illustration that 404s (art replaced by an admin) leaves the colour swatch.
    // Keyed by URL, so a new URL (art replaced, presigned refresh) gets another try.
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const inert = disabled || presetId === undefined;
    const title = themeCardTitleLook({ backgroundColor, titleColor, headingFont, titleFontFamily });
    const lockedId = useId();

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
            aria-label={label}
            aria-checked={selected}
            aria-disabled={inert}
            aria-describedby={locked ? lockedId : undefined}
            data-option-id={optionId}
            tabIndex={tabbable ? 0 : -1}
            onClick={handleClick}
            onFocus={handleFocus}
            className={cn(
                'bg-surface flex min-w-0 flex-col text-left transition aria-disabled:cursor-not-allowed',
                size === 'large' ? 'gap-1 rounded-xl p-1 pb-1.5' : 'gap-1.5 rounded-[18px] p-2 pb-2.5',
                onDark && 'bg-white',
                selected ? 'ring-2 ring-primary' : 'ring-1 ring-border hover:ring-primary/40',
                disabled && !selected && 'opacity-60',
            )}
        >
            {/* Swatch */}
            <span
                className={cn(
                    'relative block overflow-hidden bg-surface-muted',
                    size === 'large' ? 'aspect-square rounded-lg' : 'h-25 rounded-md lg:h-30',
                )}
                style={backgroundColor && isHexColor(backgroundColor) ? { backgroundColor } : undefined}
            >
                {illustrationUrl && failedUrl !== illustrationUrl && (
                    <ProtectedImage
                        src={illustrationUrl}
                        alt={label}
                        fill
                        className="object-contain"
                        sizes={size === 'large' ? '(min-width: 640px) 360px, 50vw' : '(min-width: 640px) 240px, 50vw'}
                        loading="lazy"
                        onError={handleImageError}
                    />
                )}
                {/* Plain page: "No theme" previews the event title as the page shows it without a theme */}
                {presetId === null && previewTitle !== undefined && (
                    <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center p-3">
                        <span className="line-clamp-3 text-center alegreya-light text-xl leading-tight text-balance break-words text-ink">
                            {previewTitle}
                        </span>
                    </span>
                )}
                {/* Lock: the theme needs Save my date */}
                {locked && (
                    <span
                        title={lockedLabel}
                        className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink"
                    >
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span id={lockedId} className="sr-only">
                            {lockedLabel}
                        </span>
                    </span>
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
            {/* Title, in the preset's heading font and title colour, centred in a fixed-height row:
                the event's own title when there is one, else the theme name */}
            {/* A preset's look needs a usable background (EventThemeScope's rule); a Save my date theme's always shows */}
            <span
                {...title.scopeProps}
                style={title.style}
                className="flex min-h-7 min-w-0 items-center justify-center"
            >
                {/* font-size-adjust evens out how big each font looks; the padding and leading-normal
                    leave room for script fonts and Greek accents under truncate */}
                <span
                    aria-hidden={previewTitle !== undefined || undefined}
                    className={cn(
                        'event-heading block max-w-full truncate px-1 py-1 text-center text-sm leading-normal font-semibold [font-size-adjust:0.53]',
                        title.hasTitleColor ? 'text-event-title' : 'text-ink',
                    )}
                >
                    {previewTitle ?? label}
                </span>
            </span>
            {/* Theme name, under the event title in the normal font */}
            {previewTitle !== undefined && <span className="block truncate px-1 text-center text-xs text-ink-muted">{label}</span>}
        </button>
    );
}
