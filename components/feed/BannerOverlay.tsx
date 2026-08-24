import type { ReactNode } from 'react';

export function BannerOverlay({ title, actions }: { title: string; actions?: ReactNode }) {
    return (
        <div className="absolute inset-0 flex flex-col justify-between rounded-[1.5rem]">
            <div className="flex flex-col items-end gap-2 p-3">{actions}</div>
            <div className="pointer-events-none bg-linear-to-t from-black/48 via-black/10 to-transparent px-4 pb-4 pt-16">
                <h1 className="max-w-76 text-2xl alegreya-light text-[#F2D274] drop-shadow-[0_1px_10px_rgba(0,0,0,0.32)]">{title}</h1>
            </div>
        </div>
    );
}
