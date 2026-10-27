'use client';

import { MapPin } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import type { SessionLocationIcon as SessionLocationIconModel } from '@/lib/sessionLocations';

type SessionLocationIconProps = {
    icon: SessionLocationIconModel;
    size?: 'sm' | 'lg';
    className?: string;
};

export function SessionLocationIcon({ icon, size = 'lg', className }: SessionLocationIconProps) {
    const t = useTranslations('ImageAlt');
    const dimensions = size === 'lg' ? 'h-20 w-20' : 'h-5 w-5';

    if (icon.kind === 'map-pin') {
        return <MapPin className={dimensions} strokeWidth={1.8} aria-hidden="true" />;
    }

    return (
        <Image
            src={icon.src ?? ''}
            alt={t('location')}
            width={size === 'lg' ? 80 : 18}
            height={size === 'lg' ? 80 : 18}
            unoptimized
            className={className}
        />
    );
}
