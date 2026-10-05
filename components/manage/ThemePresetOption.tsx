'use client';

import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { isHexColor } from '@/lib/eventTheme';
import { cn } from '@/lib/utils';

export function ThemePresetOption({
    presetId,
    label,
    backgroundColor,
    illustrationUrl,
    selected,
    saving,
    disabled,
    onSelectAction,
}: {
    presetId: string | null;
    label: string;
    backgroundColor: string | null;
    illustrationUrl: string | null;
    selected: boolean;
    saving: boolean;
    disabled: boolean;
    onSelectAction: (presetId: string | null) => void;
}) {
    // An illustration that 404s (art replaced by an admin) leaves the colour swatch.
    const [imageFailed, setImageFailed] = useState(false);

    function handleClick() {
        onSelectAction(presetId);
    }

    function handleImageError() {
        setImageFailed(true);
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            aria-pressed={selected}
            className={cn(
                'flex min-w-0 flex-col gap-1.5 rounded-2xl p-1.5 text-left transition disabled:cursor-not-allowed',
                selected ? 'ring-2 ring-primary' : 'ring-1 ring-border hover:ring-primary/40',
                disabled && !selected && 'opacity-60',
            )}
        >
            {/* Swatch */}
            <span
                className="relative block aspect-4/3 overflow-hidden rounded-xl bg-surface-muted"
                style={backgroundColor && isHexColor(backgroundColor) ? { backgroundColor } : undefined}
            >
                {illustrationUrl && !imageFailed && (
                    <ProtectedImage
                        src={illustrationUrl}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="160px"
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
                    <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                )}
            </span>
            {/* Label */}
            <span className="truncate px-1 text-xs font-semibold text-ink">{label}</span>
        </button>
    );
}
