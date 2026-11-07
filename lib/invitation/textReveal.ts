import type { ThemeDesign } from '@/lib/invitation/theme';

// The theme's text animations, one for one from the old @keyframes wedartText*
// (save-my-date public/legacy/editor.html). Values stay as CSS strings so the
// browser interpolates them the way it did the old keyframes.

export type TextAnimation = ThemeDesign['textAnimation'];

type Bezier = readonly [number, number, number, number];

export type TextReveal = {
    keyframes: Record<string, string[] | number[]>;
    duration: number;
    ease: Bezier;
    // Where each keyframe falls, when they are not evenly spread.
    times?: number[];
};

const CSS_EASE: Bezier = [0.25, 0.1, 0.25, 1];
const SMOOTH: Bezier = [0.2, 0.7, 0.2, 1];
const BOUNCY: Bezier = [0.34, 1.56, 0.64, 1];
const MASK: Bezier = [0.65, 0, 0.35, 1];

const TEXT_REVEALS: Record<Exclude<TextAnimation, 'none'>, TextReveal> = {
    'fade-up': { keyframes: { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] }, duration: 0.7, ease: SMOOTH },
    'fade-down': { keyframes: { opacity: [0, 1], transform: ['translateY(-18px)', 'translateY(0px)'] }, duration: 0.7, ease: SMOOTH },
    'fade-in': { keyframes: { opacity: [0, 1] }, duration: 0.8, ease: CSS_EASE },
    'slide-left': { keyframes: { opacity: [0, 1], transform: ['translateX(28px)', 'translateX(0px)'] }, duration: 0.7, ease: SMOOTH },
    'slide-right': { keyframes: { opacity: [0, 1], transform: ['translateX(-28px)', 'translateX(0px)'] }, duration: 0.7, ease: SMOOTH },
    'zoom-in': { keyframes: { opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)'] }, duration: 0.6, ease: SMOOTH },
    'zoom-out': { keyframes: { opacity: [0, 1], transform: ['scale(1.08)', 'scale(1)'] }, duration: 0.6, ease: SMOOTH },
    'blur-in': { keyframes: { opacity: [0, 1], filter: ['blur(8px)', 'blur(0px)'] }, duration: 0.8, ease: CSS_EASE },
    'rotate-in': {
        keyframes: { opacity: [0, 1], transform: ['rotate(-4deg) translateY(10px)', 'rotate(0deg) translateY(0px)'] },
        duration: 0.7,
        ease: SMOOTH,
    },
    'bounce-in': {
        keyframes: { opacity: [0, 1, 1], transform: ['translateY(24px) scale(0.94)', 'translateY(-4px) scale(1.02)', 'translateY(0px) scale(1)'] },
        duration: 0.8,
        ease: BOUNCY,
        times: [0, 0.6, 1],
    },
    'letter-spacing-in': { keyframes: { opacity: [0, 1], letterSpacing: ['0.35em', 'normal'] }, duration: 0.8, ease: CSS_EASE },
    'skew-in': {
        keyframes: { opacity: [0, 1], transform: ['skewX(-12deg) translateX(-10px)', 'skewX(0deg) translateX(0px)'] },
        duration: 0.6,
        ease: SMOOTH,
    },
    'flip-up': {
        keyframes: { opacity: [0, 1], transform: ['rotateX(-55deg) translateY(6px)', 'rotateX(0deg) translateY(0px)'] },
        duration: 0.7,
        ease: SMOOTH,
    },
    'elastic-scale': {
        keyframes: { opacity: [0, 1, 1, 1], transform: ['scale(0.4)', 'scale(1.08)', 'scale(0.96)', 'scale(1)'] },
        duration: 0.9,
        ease: SMOOTH,
        times: [0, 0.6, 0.8, 1],
    },
    'reveal-mask': { keyframes: { clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] }, duration: 0.8, ease: MASK },
    'soft-rise': {
        keyframes: { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'], filter: ['blur(2px)', 'blur(0px)'] },
        duration: 0.72,
        ease: SMOOTH,
    },
    'fade-rotate': {
        keyframes: { opacity: [0, 1], transform: ['translateY(12px) rotate(-2.5deg)', 'translateY(0px) rotate(0deg)'] },
        duration: 0.72,
        ease: SMOOTH,
    },
    'tracking-reveal': {
        keyframes: { opacity: [0, 1], letterSpacing: ['0.22em', 'normal'], filter: ['blur(2px)', 'blur(0px)'] },
        duration: 0.85,
        ease: CSS_EASE,
    },
    'scale-pop': {
        keyframes: { opacity: [0, 1, 1], transform: ['scale(0.78)', 'scale(1.035)', 'scale(1)'] },
        duration: 0.72,
        ease: [0.2, 0.9, 0.25, 1.2],
        times: [0, 0.72, 1],
    },
    'soft-bounce': {
        keyframes: { opacity: [0, 1, 1, 1], transform: ['translateY(16px)', 'translateY(-2px)', 'translateY(1px)', 'translateY(0px)'] },
        duration: 0.82,
        ease: SMOOTH,
        times: [0, 0.55, 0.78, 1],
    },
    'mask-left': {
        keyframes: { opacity: [0.2, 1], clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'], transform: ['translateX(-8px)', 'translateX(0px)'] },
        duration: 0.78,
        ease: MASK,
    },
    'mask-center': {
        keyframes: { opacity: [0.2, 1], clipPath: ['inset(0 50% 0 50%)', 'inset(0 0 0 0)'], transform: ['scale(0.98)', 'scale(1)'] },
        duration: 0.78,
        ease: MASK,
    },
    'glow-reveal': {
        keyframes: {
            opacity: [0, 1, 1],
            filter: ['blur(4px)', 'blur(0px)', 'blur(0px)'],
            textShadow: ['0 0 18px currentColor', '0 0 12px currentColor', '0 0 0 transparent'],
        },
        duration: 0.9,
        ease: CSS_EASE,
        times: [0, 0.6, 1],
    },
    'swing-in': {
        keyframes: {
            opacity: [0, 1],
            transform: ['rotateZ(-3deg) translateY(8px)', 'rotateZ(0deg) translateY(0px)'],
            transformOrigin: ['50% 0', '50% 50%'],
        },
        duration: 0.72,
        ease: SMOOTH,
    },
    'drop-in': {
        keyframes: { opacity: [0, 1, 1], transform: ['translateY(-22px) scale(0.97)', 'translateY(2px) scale(1.01)', 'translateY(0px) scale(1)'] },
        duration: 0.78,
        ease: [0.2, 0.8, 0.2, 1],
        times: [0, 0.68, 1],
    },
};

export function textReveal(animation: TextAnimation): TextReveal | undefined {
    return animation === 'none' ? undefined : TEXT_REVEALS[animation];
}

// What the animation library is given. CSS applies its easing between each pair
// of keyframes, so with more than two keyframes each gap gets the easing.
export function textRevealOptions({ duration, ease, times }: TextReveal) {
    return times ? { duration, times, ease: times.slice(1).map(() => [...ease] as [number, number, number, number]) } : { duration, ease: [...ease] as [number, number, number, number] };
}

// The old animations ended with `letter-spacing: normal` still applied, so it
// stays. Everything else ends where the text already rests, so it is cleared.
export function propertiesToClear({ keyframes }: TextReveal): string[] {
    return Object.keys(keyframes).filter((property) => property !== 'letterSpacing');
}

export function textAnimationRootClasses(animation: TextAnimation): string {
    return animation === 'none' ? '' : `wedart-text-anim-${animation} wedart-text-anim-waiting`;
}

type Box = { top: number; bottom: number; left: number; right: number; width: number; height: number };

// Old wedartTextAnimIsVisible: text waits until it is above the last 8% of the window.
export function textBlockIsOnScreen(box: Box, viewportWidth: number, viewportHeight: number): boolean {
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0 && box.left < viewportWidth && box.top < viewportHeight * 0.92;
}

export const TEXT_OBSERVER_OPTIONS: IntersectionObserverInit = { threshold: 0.01, rootMargin: '0px 0px -8% 0px' };
