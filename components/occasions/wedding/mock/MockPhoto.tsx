import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { cn } from '@/lib/utils';

type MockPhotoProps = {
    className?: string;
    // The hero feed loads its photos at once, so none pops in while the feed scrolls.
    loading?: 'eager' | 'lazy';
    photo: OccasionPhoto;
    sizes: string;
};

// A photo inside a drawn screen or card: decorative, cropped to its frame, fetched after the page text.
export function MockPhoto({ className, loading = 'lazy', photo, sizes }: MockPhotoProps) {
    return (
        <ProtectedImage
            alt=""
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
