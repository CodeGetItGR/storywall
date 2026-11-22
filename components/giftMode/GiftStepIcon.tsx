'use client';

import { useId } from 'react';

import { cn } from '@/lib/utils';

// A name tag (who it's for), the card coming out of a printer, a phone scanning the QR.
const STEP_DRAWINGS = [
    <g key="names">
        <rect x="4" y="8" width="24" height="17" rx="3.5" />
        <circle cx="11.5" cy="15" r="2.6" />
        <path d="M7.5 21.5c.8-2 2.2-3 4-3s3.2 1 4 3" />
        <path d="M18.5 14h5.5M18.5 18.5h4" />
    </g>,
    <g key="print">
        <path d="M9 12V5.5A1.5 1.5 0 0 1 10.5 4h11A1.5 1.5 0 0 1 23 5.5V12" />
        <rect x="4" y="12" width="24" height="10" rx="3" />
        <path d="M9 19h14v7.5A1.5 1.5 0 0 1 21.5 28h-11A1.5 1.5 0 0 1 9 26.5Z" />
        <path d="M13 23h6" />
        <circle cx="24" cy="15.5" r="0.6" />
    </g>,
    <g key="scan">
        <rect x="9.5" y="3.5" width="13" height="25" rx="3" />
        <path d="M14.5 25h3" />
        <rect x="13" y="10" width="6" height="6" rx="1" />
        <path d="M5 9V6.5A1.5 1.5 0 0 1 6.5 5M27 9V6.5A1.5 1.5 0 0 0 25.5 5M5 19v2.5A1.5 1.5 0 0 0 6.5 23M27 19v2.5a1.5 1.5 0 0 1-1.5 1.5" />
    </g>,
];

// One step's small drawing, in the brand gradient. Upcoming steps fade back.
export function GiftStepIcon({ index, label, muted }: { index: number; label: string; muted: boolean }) {
    // useId can hold characters that break url(#…) references.
    const gradient = `gift-step-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

    return (
        <svg
            viewBox="0 0 32 32"
            role="img"
            aria-label={label}
            className={cn('size-7 shrink-0 fill-none transition-opacity', muted && 'opacity-40 grayscale')}
            stroke={`url(#${gradient})`}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <title>{label}</title>
            <defs>
                <linearGradient id={gradient} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#C777B1" />
                    <stop offset="0.5" stopColor="#E48279" />
                    <stop offset="1" stopColor="#F2A65C" />
                </linearGradient>
            </defs>
            {STEP_DRAWINGS[index]}
        </svg>
    );
}
