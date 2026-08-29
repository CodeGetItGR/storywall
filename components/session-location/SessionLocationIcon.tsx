'use client';

import { MapPin } from 'lucide-react';
import Image from 'next/image';

import type { SessionLocationIcon as SessionLocationIconModel } from '@/lib/sessionLocations';

type SessionLocationIconProps = {
    icon: SessionLocationIconModel;
    size?: 'sm' | 'lg';
};

export function SessionLocationIcon({ icon, size = 'lg' }: SessionLocationIconProps) {
    const dimensions = size === 'lg' ? 'h-20 w-20' : 'h-5 w-5';

    if (icon.kind === 'map-pin') {
        return <MapPin className={dimensions} strokeWidth={1.8} aria-hidden="true" />;
    }

    return <Image src={icon.src ?? ''} alt="" width={size === 'lg' ? 80 : 20} height={size === 'lg' ? 80 : 20} aria-hidden="true" unoptimized />;
}
