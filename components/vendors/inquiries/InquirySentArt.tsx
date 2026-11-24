'use client';

import { motion, type Transition, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

// Brand colours from public/icons (the warm gradient every app icon uses).
const PLUM = '#C777B1';
const ROSE = '#E48279';
const CORAL = '#F2885C';
const GOLD = '#FEC463';

// One flight: the flap closes, the envelope lifts, flies up and to the right, then comes back to rest.
const FLIGHT_SECONDS = 1.4;
const FLIGHT_TIMES = [0, 0.3, 0.42, 0.75, 1];
const FLIGHT = { x: [0, 0, -3, 46, 0], y: [0, 0, 4, -36, 0], rotate: [0, 0, -6, -16, 0], scale: [1, 1, 1.03, 0.5, 1] };
const SHADOW_FLIGHT = { scaleX: [1, 1, 0.92, 0.35, 1], opacity: [1, 1, 1, 0.4, 1] };
// Where everything ends up, and all that is drawn when motion is reduced.
const AT_REST = { x: 0, y: 0, rotate: 0, scale: 1 };
const STILL: Transition = { duration: 0 };

const TRAIL = 'M12 104 C36 112 48 78 80 72 S130 44 146 20';
const SPARKLE = 'M148 8 Q149.5 14.5 156 16 Q149.5 17.5 148 24 Q146.5 17.5 140 16 Q146.5 14.5 148 8 Z';
const FLAP = 'M41 51 L80 81 L119 51 Z';
const POCKET = 'M40 50 L80 80 L120 50 V93 Q120 100 113 100 H47 Q40 100 40 93 Z';

// The envelope above "Sent." in the ask-about-my-date sheet. It plays once, then floats gently; with reduced motion
// it is the still final frame. It never leaves the frame, so the confirmation never looks empty.
export function InquirySentArt() {
    const tAlt = useTranslations('ImageAlt');
    const moving = !useReducedMotion();
    // React's ids carry characters url(#…) can't take.
    const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const body = `${id}-body`;
    const inside = `${id}-inside`;
    const flap = `${id}-flap`;
    const reveal = `${id}-reveal`;
    const flight: Transition = { duration: FLIGHT_SECONDS, times: FLIGHT_TIMES, ease: 'easeInOut' };

    return (
        <svg viewBox="0 0 160 120" role="img" aria-label={tAlt('inquirySent')} className="mx-auto h-auto w-40 overflow-visible">
            <defs>
                <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0.2" stopColor={PLUM} />
                    <stop offset="0.43" stopColor={ROSE} />
                    <stop offset="0.54" stopColor={CORAL} />
                    <stop offset="0.99" stopColor={GOLD} />
                </linearGradient>
                <linearGradient id={inside} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={PLUM} />
                    <stop offset="1" stopColor={ROSE} />
                </linearGradient>
                <linearGradient id={flap} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={ROSE} />
                    <stop offset="1" stopColor={GOLD} />
                </linearGradient>
                {/* Draws the dashed trail: a dashed stroke can't animate its own length. */}
                <mask id={reveal} maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="120">
                    <motion.path
                        d={TRAIL}
                        fill="none"
                        stroke="white"
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={moving ? { pathLength: 0 } : false}
                        animate={{ pathLength: 1 }}
                        transition={moving ? { delay: 0.55, duration: 0.55, ease: 'easeOut' } : STILL}
                    />
                </mask>
            </defs>

            {/* Trail */}
            <motion.g initial={false} animate={{ opacity: 0.5 }} transition={moving ? { delay: 1.1, duration: 0.5 } : STILL}>
                <path d={TRAIL} fill="none" stroke={CORAL} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 7" mask={`url(#${reveal})`} />
            </motion.g>
            <motion.path
                d={SPARKLE}
                fill={GOLD}
                style={{ originX: 0.5, originY: 0.5, transformBox: 'fill-box' }}
                initial={moving ? { scale: 0, rotate: -45 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={moving ? { delay: 1.0, duration: 0.35, ease: 'backOut' } : STILL}
            />

            {/* Shadow */}
            <motion.g
                style={{ originX: 0.5, originY: 0.5, transformBox: 'fill-box' }}
                animate={moving ? SHADOW_FLIGHT : { scaleX: 1, opacity: 1 }}
                transition={moving ? flight : STILL}
            >
                <ellipse cx="80" cy="111" rx="30" ry="3.5" fill={PLUM} opacity="0.18" />
            </motion.g>

            {/* Envelope */}
            <motion.g
                style={{ originX: 0.5, originY: 0.5, transformBox: 'fill-box' }}
                animate={moving ? FLIGHT : AT_REST}
                transition={moving ? flight : STILL}
            >
                <motion.g
                    animate={moving ? { y: [0, -3, 0] } : { y: 0 }}
                    transition={moving ? { delay: FLIGHT_SECONDS, duration: 3, ease: 'easeInOut', repeat: Infinity } : STILL}
                >
                    <rect x="40" y="50" width="80" height="50" rx="7" fill={`url(#${inside})`} />
                    <path d={POCKET} fill={`url(#${body})`} />
                    <path d="M40.5 99.5 L72 76 M119.5 99.5 L88 76" stroke="white" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
                    <motion.g
                        style={{ originX: 0.5, originY: 0, transformBox: 'fill-box' }}
                        initial={moving ? { scaleY: -1 } : false}
                        animate={{ scaleY: 1 }}
                        transition={moving ? { duration: 0.4, ease: 'easeInOut' } : STILL}
                    >
                        <path d={FLAP} fill={`url(#${flap})`} stroke="white" strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round" />
                    </motion.g>
                    <motion.circle
                        cx="80"
                        cy="76"
                        r="4.5"
                        fill="white"
                        style={{ originX: 0.5, originY: 0.5, transformBox: 'fill-box' }}
                        initial={moving ? { scale: 0 } : false}
                        animate={{ scale: 1 }}
                        transition={moving ? { delay: 0.38, duration: 0.2, ease: 'backOut' } : STILL}
                    />
                </motion.g>
            </motion.g>
        </svg>
    );
}
