import Image from 'next/image';
import type { ReactNode } from 'react';

function BannerOverlay({ title, actions }: { title: string; actions?: ReactNode }) {
    return (
        <div className="absolute inset-0 flex flex-col justify-between rounded-[1.5rem]">
            <div className="flex flex-col items-end gap-2 p-3">{actions}</div>
            <div className="pointer-events-none bg-linear-to-t from-black/48 via-black/10 to-transparent px-4 pb-4 pt-16">
                <h1 className="max-w-[16rem] text-2xl alegreya-light text-[#F2D274] drop-shadow-[0_1px_10px_rgba(0,0,0,0.32)]">
                    {title}
                </h1>
            </div>
        </div>
    );
}

export function Banner({ image, title, actions }: { image: string | null; title: string; actions?: ReactNode }) {
    return (
        <div className="relative w-full px-3">
            <div className="relative isolate overflow-hidden rounded-[1.5rem] bg-linear-to-br from-[#ead8cc] via-[#f4ece5] to-[#dcc6b2] shadow-[0_16px_40px_rgba(36,31,26,0.12)]">
                <div className="relative aspect-[16/11] w-full">
                    {image ? (
                        <Image src={image} alt={title} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 800px" />
                    ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.56),_rgba(255,255,255,0)_58%)]" />
                    )}
                </div>
                <BannerOverlay title={title} actions={actions} />
            </div>
        </div>
    );
}
