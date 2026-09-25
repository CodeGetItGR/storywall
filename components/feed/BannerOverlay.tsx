import type { ReactNode } from 'react';

import { LightRay } from '@/components/feed/LightRay';

export function BannerOverlay({ title, actions, glowVisible }: { title: string; actions?: ReactNode; glowVisible: boolean }) {
    return (
        <div className="@container absolute inset-0 overflow-hidden rounded-[1.5rem]">
            {/* Image frame */}
            <div
                className="absolute inset-0 rounded-[1.5rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-black/5"
                aria-hidden="true"
            />
            <div
                className="absolute inset-y-0 right-0 w-[34%] rounded-r-[1.5rem] bg-[linear-gradient(270deg,rgba(28,20,16,0.12)_0%,rgba(28,20,16,0.06)_34%,rgba(28,20,16,0)_100%)]"
                aria-hidden="true"
            />
            <div
                className="absolute inset-x-0 bottom-0 h-[58%] rounded-b-[1.5rem] bg-[linear-gradient(180deg,rgba(28,20,16,0)_0%,rgba(28,20,16,0.18)_38%,rgba(20,17,16,0.72)_100%)]"
                aria-hidden="true"
            />
            {glowVisible && <LightRay />}
            {/* Actions */}
            <div className="absolute inset-y-0 right-0 z-20 flex flex-col justify-between p-3">
                <div className="flex h-full flex-col items-end justify-between gap-2">{actions}</div>
            </div>
            {/* Title */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pt-16 pb-4">
                <div className="inline-flex max-w-[calc(100%-4rem)] px-1">
                    <h1 className="alegreya-light text-2xl text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.32)]">{title}</h1>
                </div>
            </div>
        </div>
    );
}
