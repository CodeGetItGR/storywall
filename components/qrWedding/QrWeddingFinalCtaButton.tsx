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

// The final white "Create your StoryWall" pill. At 760px and narrower it floats gently.
export function QrWeddingFinalCtaButton({ children }: { children: ReactNode }) {
    const small = useMediaQuery('(max-width: 760px)');
    const reduced = useReducedMotion();
    const moving = small && !reduced;

    return (
        <motion.a
            animate={moving ? FLOAT : { y: 0, scale: 1, boxShadow: '0 0 0 rgba(21,19,19,0)' }}
            className="mt-8.5 inline-flex min-h-14.5 w-max items-center justify-center rounded-full bg-white px-5.5 font-[Arial,sans-serif] text-[16.25px] font-medium tracking-[0.025em] text-[#151313] transition-[translate,background] duration-280 ease-[ease] max-[761px]:mt-7 max-[761px]:min-h-15 max-[761px]:w-full max-[761px]:text-[13.75px] min-[1001px]:hover:-translate-y-0.5"
            href={QR_WEDDING_CREATE_HREF}
            transition={moving ? { duration: 3.2, ease: 'easeInOut', repeat: Infinity } : { duration: 0 }}
        >
            <span className="font-medium">{children}</span>
        </motion.a>
    );
}
