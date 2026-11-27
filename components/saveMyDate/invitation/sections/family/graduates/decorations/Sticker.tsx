import type { ReactNode } from 'react';

import type { StickerKind } from '@/lib/invitation/graduatesStyles';
import type { InvitationLabels } from '@/lib/invitation/labels';

const fill = (color: string) => ({ fill: color });
// The white die-cut edge under every sticker.
const EDGE = { stroke: '#fff', strokeLinejoin: 'round' as const, paintOrder: 'stroke' as const };

const DRAWINGS: Record<StickerKind, { viewBox: string; body: ReactNode }> = {
    diploma: {
        viewBox: '0 0 120 70',
        body: (
            <>
                <g {...EDGE} strokeWidth={9}>
                    <rect x="16" y="16" width="92" height="34" rx="17" fill="#fbf6ea" />
                    <ellipse cx="18" cy="33" rx="9" ry="17" fill="#efe4cc" />
                </g>
                <ellipse cx="18" cy="33" rx="4" ry="9" fill="#d8c9a6" />
                <path d="M30 26h66M30 33h56M30 40h62" stroke="#e2d6bb" strokeWidth={2} />
                <rect x="58" y="14" width="13" height="38" style={fill('var(--primary)')} />
                <path d="M64 52 l-9 15 6-2 3 5 M65 52 l9 15-6-2-3 5" style={fill('var(--primary)')} />
            </>
        ),
    },
    books: {
        viewBox: '0 0 110 80',
        body: (
            <>
                <g {...EDGE} strokeWidth={8}>
                    <rect x="8" y="52" width="94" height="20" rx="3" style={fill('var(--primary)')} />
                    <rect x="16" y="32" width="80" height="20" rx="3" style={fill('var(--grad-rose)')} />
                    <rect x="10" y="12" width="84" height="20" rx="3" fill="#f2e3c2" />
                </g>
                <path d="M20 58h70M26 38h58M20 18h62" stroke="rgba(255,255,255,.55)" strokeWidth={2} />
            </>
        ),
    },
    champagne: {
        viewBox: '0 0 70 110',
        body: (
            <>
                <g {...EDGE} strokeWidth={8}>
                    <path
                        d="M26 44 c-8 8 -10 18 -10 30 v28 c0 4 3 6 6 6 h26 c3 0 6-2 6-6 v-28 c0-12-2-22-10-30 v-18 h-18 z"
                        style={fill('var(--grad-deep)')}
                    />
                </g>
                <rect x="26" y="20" width="18" height="10" style={fill('var(--grad-accent)')} />
                <rect x="16" y="66" width="38" height="24" rx="2" fill="#f6efe0" />
                <path d="M24 74h22M27 81h16" strokeWidth={2.4} style={{ stroke: 'var(--primary)' }} />
                <circle cx="44" cy="10" r="5" style={fill('var(--grad-accent)')} />
                <circle cx="56" cy="16" r="3.2" style={fill('var(--grad-soft)')} />
                <circle cx="30" cy="6" r="3" style={fill('var(--grad-rose)')} />
                <circle cx="60" cy="4" r="2.4" style={fill('var(--grad-accent)')} />
            </>
        ),
    },
    star: {
        viewBox: '0 0 40 40',
        body: (
            <path
                d="M20 3 l5 11 12 1.4-9 8 2.6 12L20 29.5 9.4 35.4 12 23.4l-9-8L15 14z"
                {...EDGE}
                strokeWidth={5}
                style={fill('var(--grad-accent)')}
            />
        ),
    },
    confetti: {
        viewBox: '0 0 60 40',
        body: (
            <>
                <rect x="4" y="8" width="8" height="4" rx="1" transform="rotate(-20 8 10)" style={fill('var(--grad-soft)')} />
                <rect x="24" y="2" width="8" height="4" rx="1" transform="rotate(25 28 4)" style={fill('var(--grad-accent)')} />
                <circle cx="46" cy="12" r="3" style={fill('var(--grad-rose)')} />
                <rect x="14" y="26" width="8" height="4" rx="1" transform="rotate(40 18 28)" style={fill('var(--grad-rose)')} />
                <circle cx="38" cy="30" r="2.6" style={fill('var(--primary)')} />
                <rect x="48" y="28" width="7" height="3.6" rx="1" transform="rotate(-35 51 30)" style={fill('var(--grad-soft)')} />
            </>
        ),
    },
};

type StickerProps = { kind: StickerKind; labels: InvitationLabels; className?: string; tilt?: number };

// A die-cut sticker: white outline, soft shadow, colours mixed with the theme's primary colour.
export function Sticker({ kind, labels, className = '', tilt = 0 }: StickerProps) {
    const { viewBox, body } = DRAWINGS[kind];
    return (
        <svg
            viewBox={viewBox}
            role="img"
            aria-label={labels[kind]}
            className={['grad-sticker', `grad-sticker-${kind}`, className].filter(Boolean).join(' ')}
            style={{ rotate: `${tilt}deg` }}
        >
            {body}
        </svg>
    );
}
