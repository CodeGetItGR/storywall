import Image from 'next/image';
import type { ReactNode } from 'react';

import { BannerOverlay } from '@/components/feed/BannerOverlay';

export function Banner({ image, title, actions }: { image: string | null; title: string; actions?: ReactNode }) {
    return (
        <div className="relative w-full px-3">
            {/* Banner */}
            <div className="relative isolate overflow-hidden rounded-[1.5rem] bg-linear-to-br from-[#ead8cc] via-[#f4ece5] to-[#dcc6b2] shadow-[0_16px_40px_rgba(36,31,26,0.12)]">
                <div className="relative aspect-16/11 w-full">
                    {image ? (
                        <Image src={image} alt={title} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 800px" />
                    ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.56),rgba(255,255,255,0)_58%)]" />
                    )}
                    <div
                        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2 bg-white/10 [clip-path:polygon(24%_0,100%_0,100%_100%,0_100%)]"
                        aria-hidden="true"
                    />
                    <div
                        aria-hidden="true"
                        className="playlist-light-ray pointer-events-none absolute -top-20 z-20 h-[200%] w-48 rotate-24 bg-linear-to-r from-transparent via-[#fff2a8]/55 to-transparent blur-md mix-blend-screen"
                        style={{ animationDuration: '5.8s' }}
                    />
                </div>
                <BannerOverlay title={title} actions={actions} />
            </div>
        </div>
    );
}
