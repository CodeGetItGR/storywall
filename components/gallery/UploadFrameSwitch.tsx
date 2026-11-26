'use client';

import { useId } from 'react';

import { UploadFramePreview } from '@/components/gallery/UploadFramePreview';
import type { UploadFrameControl } from '@/lib/uploadFrame';
import { cn } from '@/lib/utils';

// Add frame (KAN-304): a small preview, the label and the switch, above the upload button.
export function UploadFrameSwitch({ control, className }: { control: UploadFrameControl; className?: string }) {
    const labelId = useId();

    return (
        <button
            type="button"
            role="switch"
            aria-checked={control.on}
            aria-labelledby={labelId}
            onClick={control.toggle}
            className={cn('flex min-h-12 w-full items-center gap-3 rounded-xl text-left focus-ring', className)}
        >
            {/* Preview */}
            <UploadFramePreview src={control.previewSrc} alt={control.alt} className="aspect-[4/5] w-10 shrink-0 rounded-md" />
            {/* Label */}
            <span id={labelId} className="min-w-0 flex-1 text-sm font-semibold text-ink">
                {control.label}
            </span>
            {/* Switch */}
            <span className={cn('h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors', control.on ? 'bg-ink' : 'bg-surface-muted')}>
                <span className={cn('block size-5 rounded-full bg-white shadow-sm transition-transform', control.on && 'translate-x-4')} />
            </span>
        </button>
    );
}
