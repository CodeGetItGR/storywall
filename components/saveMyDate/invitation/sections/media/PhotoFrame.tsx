import { type PhotoFrameElement, photoFrameGeometry, photoFrameWidth, resolvePhotoFrame } from '@/lib/invitation/photoFrame';
import type { RenderContext } from '@/lib/invitation/render';

type PhotoFrameProps = {
    element: PhotoFrameElement;
    ctx: RenderContext;
};

// The host's photo seen through a frame's mask, with the frame's art on top. An
// SVG mask rather than CSS mask-image, as the old page uses, so the frame and
// the photo share one coordinate system.
export function PhotoFrame({ element, ctx }: PhotoFrameProps) {
    const frame = resolvePhotoFrame(element, ctx);
    if (!frame) return null;

    const geometry = photoFrameGeometry(element, frame);
    const width = photoFrameWidth(element.boxScale);
    const maskId = `smd-frame-mask-${element.id}`;

    return (
        <div className={`wedart-el-wrap photo-frame-el wedart-frame-anim-${element.animation}`}>
            <div className="photo-frame-inner" style={{ aspectRatio: `${frame.width} / ${frame.height}`, width, maxWidth: width }}>
                {/* Photo */}
                <svg
                    className="photo-frame-svg"
                    role="img"
                    aria-label={ctx.labels.eventPhotoAlt}
                    viewBox={`0 0 ${frame.width} ${frame.height}`}
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <mask id={maskId} maskContentUnits="userSpaceOnUse" x="0" y="0" width={frame.width} height={frame.height} style={{ maskType: 'alpha' }}>
                            <image href={frame.mask} x="0" y="0" width={frame.width} height={frame.height} preserveAspectRatio="none" />
                        </mask>
                    </defs>
                    <image
                        href={frame.photo}
                        x={geometry.x}
                        y={geometry.y}
                        width={geometry.width}
                        height={geometry.height}
                        preserveAspectRatio={geometry.preserveAspectRatio}
                        mask={`url(#${maskId})`}
                    />
                </svg>
                {/* Art */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="photo-frame-art" src={frame.art} alt={frame.name} draggable={false} />
            </div>
        </div>
    );
}
