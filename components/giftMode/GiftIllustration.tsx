'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

// An open gift box with the claim card (QR and PIN) rising out of it. Drawn in the brand gradient of the app's icons.
export function GiftIllustration({ className }: { className?: string }) {
    const t = useTranslations('GiftMode.manage');
    // useId can hold characters that break url(#…) references.
    const id = `gift-art-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const brand = `${id}-brand`;
    const brandFill = `${id}-brand-fill`;
    const soft = `${id}-soft`;
    const shadow = `${id}-shadow`;

    return (
        <svg viewBox="0 0 240 160" role="img" aria-label={t('illustrationAlt')} className={className}>
            <title>{t('illustrationAlt')}</title>
            <defs>
                <linearGradient id={brand} x1="40" y1="0" x2="200" y2="160" gradientUnits="userSpaceOnUse">
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
            <ellipse cx="120" cy="150" rx="50" ry="5" fill="#F7D8CC" />

            {/* Sparkles */}
            <path d="M40 46l1.6 4.4L46 52l-4.4 1.6L40 58l-1.6-4.4L34 52l4.4-1.6Z" fill="#FEC463" />
            <path d="M196 96l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2Z" fill="#C777B1" opacity="0.7" />
            <path d="M178 22l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1Z" fill="#F2885C" opacity="0.8" />

            {/* Heart */}
            <path
                d="M194 52c-2.4-3.6-8-2.2-8 2.2 0 4 8 9 8 9s8-5 8-9c0-4.4-5.6-5.8-8-2.2Z"
                fill={`url(#${brandFill})`}
                transform="rotate(12 194 57)"
            />

            {/* Rising lines */}
            <g stroke={`url(#${brand})`} strokeWidth="2.5" strokeLinecap="round" opacity="0.45">
                <path d="M92 40 l-6 -8" />
                <path d="M84 56 l-10 -3" />
                <path d="M156 34 l6 -8" />
            </g>

            {/* Claim card */}
            <g transform="translate(96 14) rotate(-5)" filter={`url(#${shadow})`}>
                <rect width="50" height="86" rx="7" fill="#fff" />
                <path d="M7 0h36a7 7 0 0 1 7 7v9H0V7a7 7 0 0 1 7-7Z" fill={`url(#${brandFill})`} />
                <path d="M25 5.2c-1.4-2.1-4.7-1.3-4.7 1.3 0 2.4 4.7 5.3 4.7 5.3s4.7-2.9 4.7-5.3c0-2.6-3.3-3.4-4.7-1.3Z" fill="#fff" />
                {/* QR */}
                <rect x="9" y="22" width="32" height="32" rx="3" fill={`url(#${soft})`} />
                <g fill="none" stroke="#C777B1" strokeWidth="2">
                    <rect x="12.5" y="25.5" width="7" height="7" rx="1" />
                    <rect x="30.5" y="25.5" width="7" height="7" rx="1" />
                    <rect x="12.5" y="43.5" width="7" height="7" rx="1" />
                </g>
                <g fill="#E48279">
                    <rect x="24" y="26" width="3" height="3" rx="0.6" />
                    <rect x="24" y="33" width="3" height="3" rx="0.6" />
                    <rect x="28" y="37" width="3" height="3" rx="0.6" />
                    <rect x="34" y="37" width="3" height="3" rx="0.6" />
                    <rect x="24" y="42" width="3" height="3" rx="0.6" />
                    <rect x="30" y="44" width="3" height="3" rx="0.6" />
                    <rect x="34" y="48" width="3" height="3" rx="0.6" />
                    <rect x="13" y="37" width="3" height="3" rx="0.6" />
                    <rect x="18" y="37" width="3" height="3" rx="0.6" />
                </g>
                {/* PIN */}
                <g fill="#F2885C">
                    <circle cx="14" cy="64" r="2.2" />
                    <circle cx="21.5" cy="64" r="2.2" />
                    <circle cx="29" cy="64" r="2.2" />
                    <circle cx="36.5" cy="64" r="2.2" />
                </g>
            </g>

            {/* Lid, lifted off */}
            <g transform="translate(62 82) rotate(-24)" filter={`url(#${shadow})`}>
                <rect x="-38" y="-8" width="76" height="16" rx="5" fill="#fff" stroke={`url(#${brandFill})`} strokeWidth="3" />
                <rect x="-6" y="-8" width="12" height="16" fill={`url(#${brandFill})`} />
                {/* Bow */}
                <path d="M0 -8c-6-10-18-10-16-2 1.5 5 10 3 16 2Z" fill="#fff" stroke={`url(#${brandFill})`} strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M0 -8c6-10 18-10 16-2-1.5 5-10 3-16 2Z" fill="#fff" stroke={`url(#${brandFill})`} strokeWidth="2.5" strokeLinejoin="round" />
            </g>

            {/* Box */}
            <rect x="80" y="92" width="84" height="54" rx="6" fill="#fff" stroke={`url(#${brand})`} strokeWidth="3" />
            <rect x="116" y="93.5" width="12" height="51" fill={`url(#${brandFill})`} opacity="0.9" />
        </svg>
    );
}
