import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';

// The picked type's photo, 230px with rounded bottom corners. The wizard's top row (close, bar,
// counter) sits on it, over a soft dark fade so it stays readable. It scrolls away with the step.
export function TypePhoto({ src, alt, progress }: { src: string; alt: string; progress: ReactNode }) {
    return (
        <div className="relative h-57.5 shrink-0 overflow-hidden rounded-b-[34px]">
            {/* Image */}
            <ProtectedImage src={src} alt={alt} fill priority sizes="(min-width: 768px) 440px, 100vw" className="object-cover" />
            {/* Fade */}
            <span aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-[rgba(20,14,10,0.35)] to-transparent to-40%" />
            {/* Top row */}
            <div className="absolute inset-x-4 top-3">{progress}</div>
        </div>
    );
}
