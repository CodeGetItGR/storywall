'use client';

import { type ReactNode, useId } from 'react';

import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import type { CreateEventFeatureKey } from '@/lib/createEventFeatures';
import { cn } from '@/lib/utils';

// 36px for the big four, 26px for the small row, 30px for the plan card's tiles.
const SIZE_CLASS = { big: 'size-9', small: 'size-6.5', tile: 'size-7.5' } as const;

const MASK_ICONS: Partial<Record<CreateEventFeatureKey, string>> = {
    gallery: '/landing/wedding/icons/gallery.webp',
    wishbook: '/landing/wedding/icons/wishbook.webp',
    rsvp: '/landing/wedding/icons/rsvp.webp',
    stories: '/landing/wedding/icons/stories.webp',
    playlist: '/landing/wedding/icons/playlist.webp',
    schedule: '/landing/wedding/icons/schedule.webp',
    posts: '/landing/wedding/icons/posts.webp',
};

// The mockup's line icons for the features the landing has no icon for.
const LINE_ICONS: Partial<Record<CreateEventFeatureKey, ReactNode>> = {
    qr_cards: (
        <>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
        </>
    ),
    co_hosts: (
        <>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            <circle cx="17" cy="9" r="2.6" />
            <path d="M16 14.2c2.9.4 5 2.8 5 5.8" />
        </>
    ),
    theme: (
        <>
            <path d="M12 3a9 9 0 1 0 0 18c1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z" />
            <circle cx="7.5" cy="11.5" r="1" />
            <circle cx="10" cy="7.5" r="1" />
            <circle cx="15" cy="7.5" r="1" />
        </>
    ),
    he_or_she: (
        <>
            <ellipse cx="8" cy="8" rx="4.5" ry="5.5" />
            <path d="M8 13.5c0 2.5-1.5 3.5-1.5 7.5" />
            <ellipse cx="16.5" cy="7" rx="4" ry="5" />
            <path d="M16.5 12c0 2.5 1.2 4 1.2 9" />
        </>
    ),
};

// A feature's icon in the brand gradient. Decorative: its name is always written next to it.
export function CreateEventFeatureIcon({ featureKey, size }: { featureKey: CreateEventFeatureKey; size: keyof typeof SIZE_CLASS }) {
    const gradientId = useId();
    const mask = MASK_ICONS[featureKey];
    if (mask) return <GradientIcon src={mask} className={SIZE_CLASS[size]} />;

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('shrink-0', SIZE_CLASS[size])}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f89ab0" />
                    <stop offset="0.34" stopColor="#f6a18f" />
                    <stop offset="0.68" stopColor="#f4b37b" />
                    <stop offset="1" stopColor="#f3cf8a" />
                </linearGradient>
            </defs>
            {LINE_ICONS[featureKey]}
        </svg>
    );
}
