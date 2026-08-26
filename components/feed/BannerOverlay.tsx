import type { ReactNode } from 'react';

export function BannerOverlay({ title, actions }: { title: string; actions?: ReactNode }) {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-[1.5rem]">
            <div
                className="absolute inset-0 rounded-[1.5rem] ring-1 ring-black/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                aria-hidden="true"
            />
            <div
                className="absolute inset-y-0 right-0 w-[34%] rounded-r-[1.5rem] bg-[linear-gradient(270deg,rgba(28,20,16,0.12)_0%,rgba(28,20,16,0.06)_34%,rgba(28,20,16,0)_100%)]"
                aria-hidden="true"
            />
            <div
                className="absolute inset-x-0 bottom-0 h-[40%] rounded-b-[1.5rem] bg-[linear-gradient(180deg,rgba(28,20,16,0)_0%,rgba(28,20,16,0.08)_34%,rgba(28,20,16,0.28)_100%)]"
                aria-hidden="true"
            />
            <div className="absolute inset-y-0 right-0 flex flex-col justify-between p-3">
                <div className="flex flex-col items-end gap-2  justify-between h-full">{actions}</div>
            </div>
            <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16">
                <h1 className="max-w-[50%] text-2xl alegreya-light text-[#F2D274] drop-shadow-[0_1px_10px_rgba(0,0,0,0.32)]">{title}</h1>
            </div>
        </div>
    );
}
