'use client';

import { ChevronRight } from 'lucide-react';

import type { GalleryFrameSetting } from '@/hooks/useGalleryFrameSetting';

// Photo frame on the host's gallery page: the design guests may add, opening the sheet to change it.
export function GalleryFrameRow({ setting }: { setting: GalleryFrameSetting }) {
    return (
        <button
            type="button"
            onClick={setting.openSheet}
            className="mb-5 flex min-h-12 w-full items-center gap-3 rounded-md px-1 text-left focus-ring"
        >
            {/* Label */}
            <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{setting.label}</span>
            {/* Current design */} <span className="text-sm text-ink-muted">{setting.value}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
        </button>
    );
}
