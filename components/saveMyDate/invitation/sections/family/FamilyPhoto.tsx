import { photoFieldSlot } from '@/lib/invitation/photoSlots';
import type { ImageRef } from '@/lib/invitation/primitives';
import { type RenderContext, resolveImage } from '@/lib/invitation/render';

type FamilyPhotoProps = {
    photo: ImageRef | undefined;
    // Whose photo it is, as written on the invitation.
    name: string;
    // Where the photo is kept, for the editor's camera.
    sectionId: string;
    path: string;
    ctx: RenderContext;
};

// A person's photo in the theme's photo shape. Without a photo, guests see only
// the name; the editor shows the empty shape with its camera.
export function FamilyPhoto({ photo, name, sectionId, path, ctx }: FamilyPhotoProps) {
    const src = resolveImage(photo, ctx);
    const camera = ctx.canvasTools?.photo;
    if (!src && !camera) return null;

    return (
        <div className="family-photo">
            {/* Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src && <img src={src} alt={name.trim() || ctx.labels.photoAlt} />}
            {/* Camera */}
            {camera?.(photoFieldSlot(sectionId, path), Boolean(src))}
        </div>
    );
}
