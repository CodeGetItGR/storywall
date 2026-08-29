import type { ReactNode } from 'react';

export function BannerOverlay({ title, actions, glowVisible }: { title: string; actions?: ReactNode; glowVisible: boolean }) {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-[1.5rem]">
            {/* Image frame */}
            <div
                className="absolute inset-0 rounded-[1.5rem] ring-1 ring-black/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
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
            {glowVisible && (
                <div
                    aria-hidden="true"
                    className="playlist-light-ray pointer-events-none absolute -top-20 z-20 h-[200%] w-48 rotate-24 bg-linear-to-r from-transparent via-[#fff2a8]/55 to-transparent blur-md mix-blend-screen"
                    style={{ animationDuration: '5.8s' }}
                />
            )}
            {/* Actions */}
            <div className="absolute inset-y-0 right-0 z-20 flex flex-col justify-between p-3">
                <div className="flex h-full flex-col items-end justify-between gap-2">{actions}</div>
            </div>
            {/* Title */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-16">
                <div className="inline-flex max-w-[calc(100%-4rem)] px-1">
                    <h1 className="text-2xl alegreya-light text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.32)]">{title}</h1>
                </div>
            </div>
        </div>
    );
}
