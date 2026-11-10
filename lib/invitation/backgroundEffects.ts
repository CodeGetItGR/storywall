import type { CSSProperties } from 'react';

import type { SectionStyle } from '@/lib/invitation/sectionStyle';

// The section background effects' rules, from the old engine
// (save-my-date public/legacy/effects-engine.js). Same numbers, same class names.

export type SectionEffect = NonNullable<SectionStyle['effect']>;
export type EffectType = SectionEffect['type'];

// A saved 'none' counts as no effect at all.
export function activeEffect(style: SectionStyle): SectionEffect | undefined {
    return style.effect && style.effect.type !== 'none' ? style.effect : undefined;
}

const EFFECT_CLASSES: Record<Exclude<EffectType, 'none'>, string> = {
    slowZoom: 'wedart-bg-slowzoom',
    zoomOut: 'wedart-bg-zoomout',
    kenBurnsLeft: 'wedart-bg-kenburns-left',
    kenBurnsRight: 'wedart-bg-kenburns-right',
    cinematicPulse: 'wedart-bg-cinematicpulse',
    drift: 'wedart-bg-drift',
    softGlow: 'wedart-bg-softglow',
    lightSweep: 'wedart-bg-lightsweep',
    gradientFlow: 'wedart-bg-gradientflow',
    confettiBurst: 'wedart-bg-confetti',
    canvasRealistic: 'wedart-bg-canvas-realistic',
    canvasFireworks: 'wedart-bg-canvas-fireworks',
    canvasStars: 'wedart-bg-canvas-stars',
    canvasSnow: 'wedart-bg-canvas-snow',
    fade: 'wedart-bg-fade',
    blurReveal: 'wedart-bg-blurreveal',
    vignettePulse: 'wedart-bg-vignettepulse',
    auroraGlow: 'wedart-bg-auroraglow',
    shimmer: 'wedart-bg-shimmer',
    spotlightSweep: 'wedart-bg-spotlightsweep',
    softFog: 'wedart-bg-softfog',
    lightRays: 'wedart-bg-lightrays',
    floatingDust: 'wedart-bg-floatingdust',
    softSparkles: 'wedart-bg-softsparkles',
    fallingPetals: 'wedart-bg-fallingpetals',
    heartsDrift: 'wedart-bg-heartsdrift',
    goldenDust: 'wedart-bg-goldendust',
    autumnLeaves: 'wedart-bg-autumnleaves',
    christmasTwinkle: 'wedart-bg-christmastwinkle',
    bokehLights: 'wedart-bg-bokehlights',
};

export function effectClassName({ type, speed, intensity }: SectionEffect): string {
    if (type === 'none') return '';
    return `${EFFECT_CLASSES[type]} wedart-bg-speed-${speed} wedart-bg-intensity-${intensity}`;
}

// A reveal effect brings the section's background in each time it reaches the
// screen, so nothing may be painted behind it.
export function revealsBackground(type: EffectType): boolean {
    return type === 'fade' || type === 'blurReveal';
}

// Same keyframes and duration as the old wedartBgFade and wedartBgBlurReveal.
const REVEAL_DURATION = { slow: 1.35, normal: 0.85 };
// CSS's plain `ease`.
const CSS_EASE = [0.25, 0.1, 0.25, 1] as const;

export type BackgroundReveal = {
    keyframes: { opacity: number[]; filter?: string[] };
    options: { duration: number; ease: readonly [number, number, number, number] };
};

export function backgroundReveal({ type, speed }: SectionEffect): BackgroundReveal | undefined {
    if (!revealsBackground(type)) return undefined;
    const options = { duration: REVEAL_DURATION[speed], ease: CSS_EASE };
    return type === 'fade'
        ? { keyframes: { opacity: [0, 1] }, options }
        : { keyframes: { opacity: [0.1, 1], filter: ['blur(16px)', 'blur(0px)'] }, options };
}

// A repeatable spread of numbers in 0..1, so the page looks the same on every load.
function fxFrac(i: number, salt: number): number {
    return (((i + 1) * 73 + (salt + 1) * 131) % 997) / 997;
}

const CONFETTI_COLORS = ['#ffcf4a', '#ff6b6b', '#6ed6ff', '#9b7cff', '#6ee7a8', '#ffffff', '#ff8ec7'];

const PARTICLE_COUNTS = {
    floatingDust: 26,
    softSparkles: 18,
    fallingPetals: 18,
    heartsDrift: 15,
    goldenDust: 30,
    autumnLeaves: 18,
    christmasTwinkle: 20,
    bokehLights: 14,
} as const;

type RisingOrFallingType = keyof typeof PARTICLE_COUNTS;

const PARTICLE_COLORS: Record<RisingOrFallingType, string[]> = {
    fallingPetals: ['#f7b7c8', '#f6d2da', '#e99aae', '#fff0f3'],
    heartsDrift: ['#f38ba0', '#ffb3c1', '#e96b84', '#ffd2dc'],
    goldenDust: ['#f6d365', '#ffd76a', '#f2bd43', '#fff1a8'],
    autumnLeaves: ['#d88632', '#a95d2b', '#e0a12f', '#8c4c28'],
    christmasTwinkle: ['#ffffff', '#ffd76a', '#ffefb0', '#d9fff0'],
    softSparkles: ['#ffffff', '#fff4ca', '#dff8ff', '#f8e8ff'],
    floatingDust: ['#ffffff', '#f3ead8', '#e8dfcf', '#fff8ea'],
    bokehLights: ['#ffffff', '#ffe6b5', '#e7f3ff', '#f5dfff'],
};

function particleBaseSize(type: RisingOrFallingType, c: number): number {
    if (type === 'bokehLights') return 12 + c * 34;
    if (type === 'heartsDrift') return 10 + c * 10;
    if (type === 'fallingPetals' || type === 'autumnLeaves') return 8 + c * 10;
    return 3 + c * 6;
}

function particleGlyph(type: RisingOrFallingType): string {
    if (type === 'heartsDrift') return '♥';
    return type === 'christmasTwinkle' || type === 'softSparkles' ? '✦' : '';
}

export type EffectParticle = { style: CSSProperties; glyph: string };

const asStyle = (vars: Record<string, string>) => vars as CSSProperties;

function confettiParticles(speedMul: number, intensityMul: number, strong: boolean): EffectParticle[] {
    return Array.from({ length: strong ? 42 : 28 }, (_, n) => {
        const [a, b, c, d] = [fxFrac(n, 1), fxFrac(n, 2), fxFrac(n, 3), fxFrac(n, 4)];
        const x = Math.round((a - 0.5) * 560);
        const rot = Math.round(240 + d * 760);
        return {
            glyph: '',
            style: asStyle({
                '--fx-x': `${x}px`,
                '--fx-x2': `${Math.round(x * 1.22)}px`,
                '--fx-rise': `${Math.round(-150 - b * 240)}px`,
                '--fx-fall': `${Math.round(70 + c * 160)}px`,
                '--fx-rot': `${rot}deg`,
                '--fx-rot2': `${Math.round(rot * 2.1)}deg`,
                '--fx-size': `${Math.round((7 + c * 8) * intensityMul)}px`,
                '--fx-delay': `${(n * 0.018).toFixed(3)}s`,
                '--fx-duration': `${((2.1 + b * 0.9) * speedMul).toFixed(2)}s`,
                '--fx-color': CONFETTI_COLORS[n % CONFETTI_COLORS.length],
            }),
        };
    });
}

function isParticleType(type: EffectType): type is RisingOrFallingType {
    return type in PARTICLE_COUNTS;
}

// The CSS particles of an effect; empty for every other effect.
export function effectParticles({ type, speed, intensity }: SectionEffect): EffectParticle[] {
    const speedMul = speed === 'normal' ? 0.78 : 1;
    const strong = intensity === 'strong';
    const intensityMul = strong ? 1.18 : 1;
    if (type === 'confettiBurst') return confettiParticles(speedMul, intensityMul, strong);
    if (!isParticleType(type)) return [];

    const colors = PARTICLE_COLORS[type];
    const spreadsWide = type === 'fallingPetals' || type === 'autumnLeaves';
    return Array.from({ length: Math.round(PARTICLE_COUNTS[type] * (strong ? 1.35 : 1)) }, (_, n) => {
        const [a, b, c, d, e] = [fxFrac(n, 1), fxFrac(n, 2), fxFrac(n, 3), fxFrac(n, 4), fxFrac(n, 5)];
        const size = Math.round(particleBaseSize(type, c) * intensityMul);
        return {
            glyph: particleGlyph(type),
            style: asStyle({
                '--fx-left': `${(a * 100).toFixed(2)}%`,
                '--fx-top': `${(4 + b * 84).toFixed(2)}%`,
                '--fx-delay': `${(-b * 8 * speedMul).toFixed(2)}s`,
                '--fx-duration': `${((5.5 + c * 7) * speedMul).toFixed(2)}s`,
                '--fx-size': `${size}px`,
                '--fx-height': `${Math.max(3, Math.round(size * 0.55))}px`,
                '--fx-glow': `${Math.max(7, Math.round(size * 0.9))}px`,
                '--fx-drift': `${Math.round((d - 0.5) * (spreadsWide ? 160 : 90))}px`,
                '--fx-rot': `${Math.round((e - 0.5) * 720)}deg`,
                '--fx-opacity': (0.32 + c * (strong ? 0.62 : 0.42)).toFixed(2),
                '--fx-color': colors[n % colors.length],
            }),
        };
    });
}

type Box = { top: number; bottom: number; left: number; right: number; width: number; height: number };

// Old wedartBgEffectIsVisible: the bottom 4% of the window doesn't count yet.
export function effectIsOnScreen(box: Box, viewportWidth: number, viewportHeight: number): boolean {
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0 && box.left < viewportWidth && box.top < viewportHeight - viewportHeight * 0.04;
}

export const EFFECT_OBSERVER_OPTIONS: IntersectionObserverInit = { threshold: 0.01, rootMargin: '0px 0px -4% 0px' };
