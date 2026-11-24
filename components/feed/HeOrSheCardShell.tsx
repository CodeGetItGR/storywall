'use client';

import type { ReactNode } from 'react';
import { PiBalloonFill } from 'react-icons/pi';

import { HeOrSheCloseCountdown } from '@/components/feed/HeOrSheCloseCountdown';
import { LightRay } from '@/components/feed/LightRay';

type HeOrSheCardShellProps = { title: string; closesTime: number | null; children: ReactNode };

/** The Boy or Girl card: the gradient, the balloons, the module's name and the countdown. Its body comes from the caller. */
export function HeOrSheCardShell({ title, closesTime, children }: HeOrSheCardShellProps) {
    return (
        <article className="mt-3 p-2">
            <div className="@container relative isolate overflow-hidden rounded-2xl bg-linear-to-br from-sky-100 via-white to-pink-100 px-5 pt-7 pb-6 shadow-[0_10px_30px_rgba(36,31,26,0.08)] ring-1 ring-white/80">
                {/* Decoration */}
                <LightRay />
                <PiBalloonFill
                    className="he-or-she-balloon pointer-events-none absolute top-4 left-4 -z-10 h-12 w-12 text-sky-300/45"
                    aria-hidden="true"
                />
                <PiBalloonFill
                    className="he-or-she-balloon pointer-events-none absolute right-5 bottom-16 -z-10 h-14 w-14 text-pink-300/45 [animation-delay:-3s]"
                    aria-hidden="true"
                />

                {/* Header */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <h2 className="event-heading alegreya-light text-4xl leading-tight text-balance text-ink">{title}</h2>
                    {closesTime !== null && <HeOrSheCloseCountdown time={closesTime} />}
                </div>

                {/* Body */}
                {children}
            </div>
        </article>
    );
}
