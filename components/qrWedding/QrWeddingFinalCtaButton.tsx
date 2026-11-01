'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { QR_WEDDING_CREATE_HREF } from '@/lib/qrWeddingPage';

const FLOAT = {
    y: [0, -4, 0],
    scale: [1, 1.008, 1],
    boxShadow: ['0 12px 34px rgba(21,19,19,.10)', '0 18px 38px rgba(21,19,19,.14)', '0 12px 34px rgba(21,19,19,.10)'],
};
const NUDGE = { x: [0, 4, 0], y: [0, -4, 0] };

// The final white "Create your StoryWall" pill. At 760px and narrower it floats gently and its arrow nudges.
export function QrWeddingFinalCtaButton({ children }: { children: ReactNode }) {
    const small = useMediaQuery('(max-width: 760px)');
    const reduced = useReducedMotion();
    const moving = small && !reduced;

    return (
        <motion.a
            animate={moving ? FLOAT : { y: 0, scale: 1, boxShadow: '0 0 0 rgba(21,19,19,0)' }}
            className="group mt-8.5 inline-flex min-h-14.5 w-max items-center justify-center gap-7.5 rounded-full bg-white px-5.5 font-[Arial,sans-serif] text-[16.25px] font-medium tracking-[0.025em] text-[#151313] transition-[translate,background] duration-280 ease-[ease] max-[761px]:mt-7 max-[761px]:min-h-15 max-[761px]:w-full max-[761px]:justify-between max-[761px]:pr-5 max-[761px]:text-[13.75px] min-[1001px]:hover:-translate-y-0.5"
            href={QR_WEDDING_CREATE_HREF}
            transition={moving ? { duration: 3.2, ease: 'easeInOut', repeat: Infinity } : { duration: 0 }}
        >
            <span className="font-medium">{children}</span>
            <motion.span
                animate={moving ? NUDGE : { x: 0, y: 0 }}
                aria-hidden="true"
                className="inline-flex items-center justify-center text-[21px] leading-none transition-[translate] duration-280 ease-[ease] max-[761px]:inline-block min-[1001px]:group-hover:translate-x-0.75 min-[1001px]:group-hover:-translate-y-0.75"
                transition={moving ? { duration: 1.8, ease: 'easeInOut', repeat: Infinity } : { duration: 0 }}
            >
                ↗
            </motion.span>
        </motion.a>
    );
}
