import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { photoFieldSlot } from '@/lib/invitation/photoSlots';
import { type RenderContext, resolveImage, type TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type PhotoSectionProps = {
    section: Extract<InvitationSection, { type: 'photo' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

const DEFAULT_HEIGHT = 420;

// A full-width photo band, cropped to the host's chosen height and position.
export function PhotoSection({ section, contrast, ctx }: PhotoSectionProps) {
    const { photo, imageY } = section.data;
    const src = resolveImage(photo, ctx);

    return (
        <div className="section-inner photo-section-inner" style={{ height: section.style.minHeight || DEFAULT_HEIGHT }}>
            {/* Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src && <img src={src} alt={ctx.labels.eventPhotoAlt} style={{ objectPosition: `50% ${imageY}%` }} draggable={false} />}
            {/* Move */}
            {src && ctx.canvasTools?.photoBand?.(section.id, imageY)}
            {/* Camera */}
            {ctx.canvasTools?.photo?.(photoFieldSlot(section.id, 'photo'), Boolean(src))}
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
