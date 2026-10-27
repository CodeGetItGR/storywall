import { motion, type Transition } from 'framer-motion';

import { useTypewriter } from '@/hooks/useTypewriter';

// On for just under half of each 0.8s, then off.
const CARET_BLINK: Transition = { duration: 0.8, times: [0, 0.485, 0.49, 1], ease: 'linear', repeat: Infinity };

type LandingHeroTypewriterProps = {
    prefix: string;
    words: readonly string[];
    // The whole line for screen readers, which skip the typing.
    label: string;
    motionPaused: boolean;
};

export function LandingHeroTypewriter({ prefix, words, label, motionPaused }: LandingHeroTypewriterProps) {
    const { text, still } = useTypewriter(words, motionPaused);

    return (
        <p className="mb-5 flex min-h-[1.35em] items-baseline gap-[.42em] font-[Baskerville,Georgia,serif] text-[clamp(31px,8.05vw,39px)] leading-[1.16] font-normal tracking-[-.02em] min-[761px]:mb-6 min-[761px]:ml-[7px] min-[761px]:gap-[.38em] min-[761px]:text-[clamp(23.5px,1.76vw,32.5px)] min-[761px]:leading-[1.2] min-[761px]:whitespace-nowrap">
            <span className="sr-only">{label}</span>
            <span aria-hidden>{prefix}</span>
            {/* Typed word */}
            <span
                aria-hidden
                className="inline-block min-w-[1ch] bg-[linear-gradient(90deg,#df7794_0%,#f29365_52%,#f2c764_100%)] bg-clip-text font-medium text-transparent"
            >
                {text}
            </span>
            {/* Caret */}
            <motion.span
                animate={still ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
                aria-hidden
                className="-ml-[.18em] h-[1.05em] w-[2px] translate-y-[.1em] bg-[linear-gradient(180deg,#df7794_0%,#f29365_55%,#f2c764_100%)]"
                transition={still ? { duration: 0 } : CARET_BLINK}
            />
        </p>
    );
}
