import type { ImageRef } from '@/lib/invitation/primitives';
import { type RenderContext, resolveImage } from '@/lib/invitation/render';

type FamilyPhotoProps = {
    photo: ImageRef | undefined;
    // Whose photo it is, as written on the invitation.
    name: string;
    ctx: RenderContext;
};

// A person's photo in the theme's photo shape. Without a photo, guests see only the name.
export function FamilyPhoto({ photo, name, ctx }: FamilyPhotoProps) {
    const src = resolveImage(photo, ctx);
    if (!src) return null;

    return (
        <div className="family-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={name.trim() || ctx.labels.photoAlt} />
        </div>
    );
}
