import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { cn } from '@/lib/utils';

type MockPhotoProps = {
    alt: string;
    className?: string;
    // The hero feed loads its photos at once, so none pops in while the feed scrolls.
    loading?: 'eager' | 'lazy';
    photo: OccasionPhoto;
    sizes: string;
};

// A photo inside a drawn screen or card, cropped to its frame and fetched after the page text.
export function MockPhoto({ alt, className, loading = 'lazy', photo, sizes }: MockPhotoProps) {
    return (
        <ProtectedImage
            alt={alt}
            className={cn('object-cover', className)}
            fetchPriority="low"
            height={photo.height}
            loading={loading}
            sizes={sizes}
            src={photo.src}
            style={photo.position ? { objectPosition: photo.position } : undefined}
            width={photo.width}
        />
    );
}
