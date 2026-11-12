import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { GalleryPhotos } from '@/components/saveMyDate/invitation/sections/media/GalleryPhotos';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { galleryImages } from '@/lib/invitation/gallery';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type GallerySectionProps = {
    section: Extract<InvitationSection, { type: 'gallery' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

export function GallerySection({ section, contrast, ctx }: GallerySectionProps) {
    const { data } = section;
    const images = galleryImages(data, ctx);

    return (
        <div className="section-inner gallery-editor">
            {/* Title */}
            <SectionText section={section} path="title" value={data.title} tag="h2" contrast={contrast} ctx={ctx} />
            {/* Photos */}
            {images.length > 0 ? (
                <GalleryPhotos images={images} layout={data.layout} shape={data.shape} labels={ctx.labels} />
            ) : (
                ctx.canvasTools?.gallery?.(section.id, data.images)
            )}
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
