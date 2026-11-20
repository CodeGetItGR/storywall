'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

// The event card, with its photos, dropping into a bin. Drawn in the brand gradient of the app's icons.
export function DeleteEventIllustration({ className }: { className?: string }) {
    const t = useTranslations('ManagePage.settings.dangerZone');
    // useId can hold characters that break url(#…) references.
    const id = `delete-art-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const brand = `${id}-brand`;
    const brandFill = `${id}-brand-fill`;
    const soft = `${id}-soft`;
    const shadow = `${id}-shadow`;

    return (
        <svg viewBox="0 0 240 160" role="img" aria-label={t('illustrationAlt')} className={className}>
            <title>{t('illustrationAlt')}</title>
            <defs>
                <linearGradient id={brand} x1="30" y1="0" x2="200" y2="160" gradientUnits="userSpaceOnUse">
                    <stop offset="0.1" stopColor="#C777B1" />
                    <stop offset="0.45" stopColor="#E48279" />
                    <stop offset="0.6" stopColor="#F2885C" />
                    <stop offset="1" stopColor="#FEC463" />
                </linearGradient>
                <linearGradient id={brandFill} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#C777B1" />
                    <stop offset="0.5" stopColor="#E48279" />
                    <stop offset="1" stopColor="#FEC463" />
                </linearGradient>
                <linearGradient id={soft} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#F6D9EC" />
                    <stop offset="1" stopColor="#FFE6CC" />
                </linearGradient>
                <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#E48279" floodOpacity="0.18" />
                </filter>
            </defs>

            {/* Backdrop */}
            <ellipse cx="120" cy="96" rx="104" ry="56" fill="#FFF0EB" />
            <ellipse cx="120" cy="150" rx="46" ry="5" fill="#F7D8CC" />

            {/* Floating photo */}
            <g transform="translate(20 20) rotate(-14)" filter={`url(#${shadow})`}>
                <rect width="34" height="38" rx="4" fill="#fff" />
                <rect x="4" y="4" width="26" height="22" rx="2" fill={`url(#${soft})`} />
                <circle cx="23" cy="10" r="3" fill="#FEC463" />
                <path d="M4 24 L12 15 L18 21 L22 17 L30 25 V26 H4 Z" fill="#E48279" opacity="0.55" />
            </g>

            {/* Heart */}
            <path
                d="M201 30c-2.4-3.6-8-2.2-8 2.2 0 4 8 9 8 9s8-5 8-9c0-4.4-5.6-5.8-8-2.2Z"
                fill={`url(#${brandFill})`}
                transform="rotate(12 201 35)"
            />

            {/* Sparkles */}
            <path d="M24 92l1.6 4.4L30 98l-4.4 1.6L24 104l-1.6-4.4L18 98l4.4-1.6Z" fill="#FEC463" />
            <path d="M188 112l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2Z" fill="#C777B1" opacity="0.7" />

            {/* Motion */}
            <g stroke={`url(#${brand})`} strokeWidth="2.5" strokeLinecap="round" opacity="0.5">
                <path d="M190 54 l10 -6" />
                <path d="M194 66 l13 -4" />
                <path d="M186 42 l6 -8" />
            </g>

            {/* Event card */}
            <g transform="translate(118 8) rotate(18)" filter={`url(#${shadow})`}>
                <rect width="64" height="78" rx="8" fill="#fff" />
                <path d="M8 0h48a8 8 0 0 1 8 8v16H0V8a8 8 0 0 1 8-8Z" fill={`url(#${brandFill})`} />
                <path d="M32 9.5c-1.7-2.6-5.8-1.6-5.8 1.6 0 2.9 5.8 6.5 5.8 6.5s5.8-3.6 5.8-6.5c0-3.2-4.1-4.2-5.8-1.6Z" fill="#fff" />
                <rect x="7" y="31" width="23" height="19" rx="3" fill={`url(#${soft})`} />
                <path d="M7 47 L14 39 L20 44 L23 41 L30 47 V50 H7 Z" fill="#C777B1" opacity="0.45" />
                <rect x="34" y="31" width="23" height="19" rx="3" fill={`url(#${soft})`} />
                <circle cx="45.5" cy="40.5" r="4.5" fill="#F2885C" opacity="0.55" />
                <rect x="7" y="57" width="50" height="4" rx="2" fill="#F3DED5" />
                <rect x="7" y="66" width="32" height="4" rx="2" fill="#F3DED5" />
            </g>

            {/* Bin */}
            {/* Lid, leaning on the bin */}
            <g transform="translate(67 105) rotate(-66)">
                <rect x="-14" y="-13" width="28" height="9" rx="4.5" fill="#fff" stroke={`url(#${brandFill})`} strokeWidth="3" />
                <rect x="-45" y="-5.5" width="90" height="11" rx="5.5" fill="#fff" stroke={`url(#${brandFill})`} strokeWidth="3" />
            </g>
            <path
                d="M84 94h72l-6.2 48.4a6 6 0 0 1-6 5.2H96.2a6 6 0 0 1-6-5.2Z"
                fill="#fff"
                stroke={`url(#${brand})`}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <g stroke={`url(#${brand})`} strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
                <path d="M106 106v30" />
                <path d="M120 106v30" />
                <path d="M134 106v30" />
            </g>
        </svg>
    );
}
