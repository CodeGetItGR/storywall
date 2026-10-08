import { ProtectedImage } from '@/components/common/ProtectedImage';
import { cn } from '@/lib/utils';

// Without a logo (the admin preview) it keeps its place as a neutral circle.
export function PartnerLogo({ src, size, className }: { src: string | null; size: number; className?: string }) {
    return (
        <span
            className={cn(
                'relative block shrink-0 overflow-hidden rounded-full ring-1 ring-black/5',
                src ? 'bg-white' : 'bg-surface-muted',
                className,
            )}
            style={{ width: size, height: size }}
        >
            {src && <ProtectedImage src={src} alt="" fill sizes={`${size}px`} className="object-contain" />}
        </span>
    );
}
