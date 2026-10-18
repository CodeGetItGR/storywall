import Image from 'next/image';

import type { DemoCollage } from '@/lib/occasions/demoPreview';

// A server-rendered photo wall from the occasion's demo, under the demo band's link to the live one.
export function OccasionDemoPreview({ collage }: { collage: DemoCollage }) {
    const { lead, tiles, wish } = collage;
    const hasSide = tiles.length > 0 || wish !== null;

    return (
        <div className={`mt-10 grid gap-2.5 min-[761px]:mt-14 min-[761px]:gap-3 ${hasSide ? 'min-[761px]:grid-cols-[1.2fr_1fr]' : ''}`}>
            {/* Lead photo and its post */}
            <figure className="relative m-0 aspect-[4/5] overflow-hidden rounded-[22px] bg-white/40 min-[761px]:aspect-auto min-[761px]:min-h-110">
                <Image alt="" className="object-cover" fill sizes="(min-width: 761px) 50vw, 100vw" src={lead.photo.src} />
                {lead.post ? (
                    <figcaption className="absolute inset-x-3 bottom-3 max-w-80 rounded-2xl bg-white/92 px-4 py-3.5 shadow-[0_18px_36px_-24px_rgba(70,38,24,0.55)] min-[761px]:inset-x-5 min-[761px]:bottom-5">
                        <p className="m-0 text-xs font-bold">{lead.post.author}</p>
                        <p className="mt-1 mb-0 line-clamp-2 text-sm leading-[1.45] text-[#151313]/80">{lead.post.content}</p>
                    </figcaption>
                ) : null}
            </figure>

            {hasSide ? (
                <div className="grid grid-cols-2 content-start gap-2.5 min-[761px]:gap-3">
                    {/* More photos; an odd last one spans the row */}
                    {tiles.map((photo, index) => (
                        <div
                            className={`relative overflow-hidden rounded-[18px] bg-white/40 ${index === tiles.length - 1 && tiles.length % 2 === 1 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}`}
                            key={photo.src}
                        >
                            <Image alt="" className="object-cover" fill sizes="(min-width: 761px) 22vw, 50vw" src={photo.src} />
                        </div>
                    ))}

                    {/* A wish from the book */}
                    {wish ? (
                        <figure className="col-span-2 m-0 rounded-[18px] bg-white/75 px-5 py-6 min-[761px]:px-7 min-[761px]:py-8">
                            <blockquote className="m-0 line-clamp-4 [font-family:var(--editorial)] text-[22px] leading-[1.3] tracking-[-0.01em] min-[761px]:text-[26px]">
                                {wish.message}
                            </blockquote>
                            <figcaption className="mt-3 text-xs font-bold text-[#151313]/70">{wish.guestName}</figcaption>
                        </figure>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
