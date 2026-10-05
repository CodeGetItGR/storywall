'use client';

import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { isHexColor } from '@/lib/eventTheme';
import { cn } from '@/lib/utils';

// One radio of the theme picker. "Disabled" is aria-disabled with a no-op click, never the
// disabled attribute: that would drop focus to the body the moment a save starts.
export function ThemePresetOption({
    optionId,
    presetId,
    label,
    backgroundColor,
    illustrationUrl,
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
                'bg-surface flex min-w-0 flex-col gap-2.5 p-2.5 pb-3 text-left transition aria-disabled:cursor-not-allowed',
                size === 'large' ? 'rounded-xl' : 'rounded-2xl',
                selected ? 'ring-2 ring-primary' : 'ring-1 ring-border hover:ring-primary/40',
                disabled && !selected && 'opacity-60',
            )}
        >
            {/* Swatch */}
            <span
                className={cn('relative block aspect-4/3 overflow-hidden bg-surface-muted', size === 'large' ? 'rounded-lg' : 'rounded-xl')}
                style={backgroundColor && isHexColor(backgroundColor) ? { backgroundColor } : undefined}
            >
                {illustrationUrl && failedUrl !== illustrationUrl && (
                    <ProtectedImage
                        src={illustrationUrl}
                        alt=""
                        fill
                        className="object-contain"
                        sizes={size === 'large' ? '(min-width: 640px) 320px, 50vw' : '(min-width: 640px) 240px, 50vw'}
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
            {/* Label */}
            <span className="truncate px-1 text-sm font-semibold text-ink">{label}</span>
        </button>
    );
}
