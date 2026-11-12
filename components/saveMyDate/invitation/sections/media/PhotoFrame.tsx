import { type PhotoFrameElement, photoFrameGeometry, photoFrameWidth, resolveFrameArt } from '@/lib/invitation/photoFrame';
import { photoFrameSlot } from '@/lib/invitation/photoSlots';
import { type RenderContext, resolveImage } from '@/lib/invitation/render';

type PhotoFrameProps = {
    element: PhotoFrameElement;
    ctx: RenderContext;
};

// The host's photo seen through a frame's mask, with the frame's art on top. An
// SVG mask rather than CSS mask-image, as the old page uses, so the frame and
// the photo share one coordinate system. Guests see a frame only with its photo;
// the editor shows an empty frame with its camera, and admins a frame not chosen yet.
export function PhotoFrame({ element, ctx }: PhotoFrameProps) {
    const frame = resolveFrameArt(element, ctx);
    const photo = resolveImage(element.photo, ctx);
    const tools = ctx.canvasTools;
    if (!frame) return tools?.frameSettings ? <FrameNotChosen element={element} ctx={ctx} /> : null;
    if (!photo && !tools?.photo) return null;

    const geometry = photoFrameGeometry(element, frame);
    const width = photoFrameWidth(element.boxScale);
    const maskId = `smd-frame-mask-${element.id}`;

    return (
        <div className={`wedart-el-wrap photo-frame-el wedart-frame-anim-${element.animation}`}>
            <div className="photo-frame-inner" style={{ aspectRatio: `${frame.width} / ${frame.height}`, width, maxWidth: width }}>
                {/* Photo */}
                {photo && (
                    <svg
                        className="photo-frame-svg"
                        role="img"
                        aria-label={ctx.labels.eventPhotoAlt}
                        viewBox={`0 0 ${frame.width} ${frame.height}`}
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <mask
                                id={maskId}
                                maskContentUnits="userSpaceOnUse"
                                x="0"
                                y="0"
                                width={frame.width}
                                height={frame.height}
                                style={{ maskType: 'alpha' }}
                            >
                                <image href={frame.mask} x="0" y="0" width={frame.width} height={frame.height} preserveAspectRatio="none" />
                            </mask>
                        </defs>
                        <image
                            href={photo}
                            x={geometry.x}
                            y={geometry.y}
                            width={geometry.width}
                            height={geometry.height}
                            preserveAspectRatio={geometry.preserveAspectRatio}
                            mask={`url(#${maskId})`}
                        />
                    </svg>
                )}
                {/* Art */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="photo-frame-art" src={frame.art} alt={frame.name} draggable={false} />
                {/* Move and zoom */}
                {photo && tools?.framePhoto?.(element)}
                {/* Camera */}
                {tools?.photo?.(photoFrameSlot(element.id), Boolean(photo))}
                {/* Frame */}
                {tools?.frameSettings?.(element)}
                {tools?.element?.(element)}
            </div>
        </div>
    );
}

// An empty square at the frame's size, for admins to pick a frame in.
function FrameNotChosen({ element, ctx }: PhotoFrameProps) {
    const width = photoFrameWidth(element.boxScale);
    return (
        <div className="wedart-el-wrap photo-frame-el">
            <div
                className="photo-frame-inner photo-frame-not-chosen border border-dashed border-[#c9c1ba] bg-[#f6f2ee]"
                style={{ aspectRatio: '1 / 1', width, maxWidth: width }}
            >
                {/* Frame */}
                {ctx.canvasTools?.frameSettings?.(element)}
                {ctx.canvasTools?.element?.(element)}
            </div>
        </div>
    );
}
