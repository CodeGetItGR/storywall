import Image from 'next/image';
import { ReactNode } from 'react';

import { Logo } from '@/components/common/Logo';

interface InviteLayoutProps {
    coverImageSrc: string;
    coverImageAlt: string;
    eventTitle: string;
    eventSubtitle?: string | null;
    children: ReactNode;
}

export function InviteLayout({ coverImageSrc, coverImageAlt, eventTitle, eventSubtitle, children }: InviteLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col lg:flex-row lg:h-screen bg-background">
            <div className="relative w-full h-64 sm:h-80 lg:h-screen lg:w-1/2 shrink-0">
                <Image
                    src={coverImageSrc}
                    alt={coverImageAlt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    preload
                    loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 xl:p-16">
                    <h1 className="text-2xl lg:text-4xl xl:text-5xl font-bold text-white text-balance">{eventTitle}</h1>
                    {eventSubtitle && <p className="text-sm lg:text-base text-white/80 mt-2 max-w-md">{eventSubtitle}</p>}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 lg:w-1/2 lg:p-12">
                <div className="w-full max-w-sm lg:max-w-md flex flex-col items-center">
                    <Logo direction="col" iconClassName="h-7 w-auto" wordmarkClassName="h-5 w-auto" className="mb-6" />
                    <div className="w-full">{children}</div>
                </div>
            </div>
        </div>
    );
}
