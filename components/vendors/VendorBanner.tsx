import { ProtectedImage } from '@/components/common/ProtectedImage';
import { cn } from '@/lib/utils';

// The vendor's wide cover photo, or a soft backdrop in the logo gradient when there is none. The parent sets the
// height and the corners.
export function VendorBanner({ bannerUrl, alt, sizes, className }: { bannerUrl: string | null; alt: string; sizes: string; className?: string }) {
    return (
        <div className={cn('relative overflow-hidden bg-surface-muted', className)}>
            {bannerUrl ? (
                <ProtectedImage src={bannerUrl} alt={alt} fill sizes={sizes} className="object-cover" />
            ) : (
                <div className="absolute inset-0 bg-(image:--logo) opacity-30" />
            )}
        </div>
    );
}
