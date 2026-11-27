import Image from 'next/image';

import { cn } from '@/lib/utils';

// The photo the frame previews sit on: only a backdrop, so it carries no alt of its own.
export const FRAME_SAMPLE_PHOTO = '/landing/friends-and-family-celebrating-at-sunset.webp';

// A frame drawn over the sample photo (KAN-304). src null: the photo alone ("No frame"); alt names what is shown.
export function UploadFramePreview({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
    return (
        <span
            className={cn('relative block overflow-hidden bg-surface-muted bg-cover bg-center', className)}
            style={{ backgroundImage: `url(${FRAME_SAMPLE_PHOTO})` }}
        >
            {src ? (
                <Image src={src} alt={alt} fill unoptimized className="object-fill" />
            ) : (
                <span role="img" aria-label={alt} className="absolute inset-0" />
            )}
        </span>
    );
}
