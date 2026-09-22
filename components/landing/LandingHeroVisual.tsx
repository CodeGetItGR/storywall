import { motion, type TargetAndTransition, useReducedMotion } from 'framer-motion';

import { ProtectedImage } from '@/components/common/ProtectedImage';
const HERO_SPRITES = [
    {
        src: '/landing/sw-scene-item-sw-post-1.webp',
        width: 696,
        height: 612,
        posClass:
            'absolute h-auto max-w-none left-[-0.72%] top-[56.88%] w-[40.43%] z-[4] min-[761px]:left-[-4.66%] min-[761px]:top-[41.73%] min-[761px]:w-[43.3%] min-[761px]:z-[3]',
        motionClass: 'motion-hero-drift-left',
        duration: '8.8s',
        delay: '0s',
    },
    {
        src: '/landing/sw-scene-item-sw-post-2.webp',
        width: 624,
        height: 677,
        posClass:
            'absolute h-auto max-w-none left-[53.62%] top-[67.51%] w-[38.24%] z-[12] min-[761px]:left-[59.2%] min-[761px]:top-[53.67%] min-[761px]:w-[32.3%] min-[761px]:z-[8]',
        motionClass: 'motion-hero-drift-right',
        duration: '9.3s',
        delay: '0s',
    },
    {
        src: '/landing/sw-scene-item-sw-comment-1.webp',
        width: 705,
        height: 360,
        posClass:
            'absolute h-auto max-w-none left-[42.75%] top-[37.68%] w-[44.99%] z-[12] min-[761px]:left-[51.2%] min-[761px]:top-[37.4%] min-[761px]:w-[35%] min-[761px]:z-[9]',
        motionClass: 'motion-hero-drift-right',
        duration: '8.5s',
        delay: '-1.4s',
    },
    {
        src: '/landing/sw-scene-item-sw-comment-2.webp',
        width: 557,
        height: 300,
        posClass:
            'absolute h-auto max-w-none left-[49.39%] top-[99.25%] w-[36.65%] z-[12] min-[761px]:left-[58.07%] min-[761px]:top-[81.38%] min-[761px]:w-[39.1%] min-[761px]:z-[9]',
        motionClass: 'motion-hero-drift-left',
        duration: '9.3s',
        delay: '-0.8s',
    },
    {
        src: '/landing/sw-scene-item-sw-love.webp',
        width: 441,
        height: 440,
        posClass:
            'absolute h-auto max-w-none left-[8.73%] top-[12.27%] w-[23.39%] z-[12] min-[761px]:left-[6.14%] min-[761px]:top-[13.72%] min-[761px]:w-[18.2%] min-[761px]:z-[10]',
        motionClass: 'motion-hero-float-strong',
        duration: '7.6s',
        delay: '0s',
    },
    {
        src: '/landing/sw-scene-item-sw-happy.webp',
        width: 240,
        height: 281,
        posClass:
            'absolute h-auto max-w-none left-[68.93%] top-[27.59%] w-[13.62%] z-[12] min-[761px]:left-[64.97%] min-[761px]:top-[22.78%] min-[761px]:w-[10.4%] min-[761px]:z-[10]',
        motionClass: 'motion-hero-float-soft',
        duration: '6.5s',
        delay: '-0.9s',
    },
    {
        src: '/landing/sw-scene-item-sw-fire.webp',
        width: 165,
        height: 231,
        posClass:
            'absolute h-auto max-w-none left-[6.3%] top-[67.92%] w-[5.4%] z-[12] min-[761px]:left-[-2.33%] min-[761px]:top-[66.52%] min-[761px]:w-[10.3%] min-[761px]:z-[10]',
        motionClass: 'motion-hero-float-soft',
        duration: '7.6s',
        delay: '-1.6s',
    },
    {
        src: '/landing/sw-scene-item-sw-flash.webp',
        width: 124,
        height: 181,
        posClass:
            'absolute h-auto max-w-none left-[62.45%] top-[93.06%] w-[4.2%] z-[12] min-[761px]:left-[76.24%] min-[761px]:top-[74.09%] min-[761px]:w-[4.2%] min-[761px]:z-[11]',
        motionClass: 'motion-hero-pulse-flash',
        duration: '5.1s',
        delay: '0s',
    },
    {
        src: '/landing/sw-scene-item-sw-glasses.webp',
        width: 253,
        height: 331,
        posClass:
            'absolute h-auto max-w-none left-[62.64%] top-[85.86%] w-[17.42%] z-[12] min-[761px]:left-[76.82%] min-[761px]:top-[72.86%] min-[761px]:w-[12.9%] min-[761px]:z-[11]',
        motionClass: 'motion-hero-float-soft',
        duration: '7.6s',
        delay: '-2.1s',
    },
    {
        src: '/landing/sw-scene-item-sw-note.webp',
        width: 241,
        height: 324,
        posClass:
            'absolute h-auto max-w-none left-[13.2%] top-[85.25%] w-[17.46%] z-[12] min-[761px]:left-[12.7%] min-[761px]:top-[71.44%] min-[761px]:w-[15.7%] min-[761px]:z-[10]',
        motionClass: 'motion-hero-note-float',
        duration: '7.6s',
        delay: '-0.5s',
    },
    {
        src: '/landing/sw-scene-item-sw-celebrate.webp',
        width: 171,
        height: 269,
        posClass:
            'absolute h-auto max-w-none left-[53.54%] top-[34.68%] w-[10.85%] z-[12] min-[761px]:left-[67.4%] min-[761px]:top-[34.2%] min-[761px]:w-[7%] min-[761px]:z-[11]',
        motionClass: 'motion-hero-float-soft',
        duration: '6s',
        delay: '-1.2s',
    },
    {
        src: '/landing/sw-scene-item-sw-heart-1.webp',
        width: 111,
        height: 155,
        posClass:
            'absolute h-auto max-w-none left-[18.41%] top-[40.31%] w-[5.6%] z-[12] min-[761px]:left-[18.4%] min-[761px]:top-[40.3%] min-[761px]:w-[5.6%] min-[761px]:z-[10]',
        motionClass: 'motion-hero-heart-float',
        duration: '6.8s',
        delay: '-0.8s',
    },
    {
        src: '/landing/sw-scene-item-sw-heart-2.webp',
        width: 167,
        height: 219,
        posClass:
            'absolute h-auto max-w-none left-[75.58%] top-[21.78%] w-[4.5%] z-[12] min-[761px]:left-[72.04%] min-[761px]:top-[15.84%] min-[761px]:w-[3.9%] min-[761px]:z-[10]',
        motionClass: 'motion-hero-heart-float',
        duration: '6s',
        delay: '-1.8s',
    },
    {
        src: '/landing/sw-scene-item-sw-heart-3.webp',
        width: 200,
        height: 243,
        posClass:
            'absolute h-auto max-w-none left-[88.07%] top-[48.02%] w-[9.21%] z-[12] min-[761px]:left-[80.53%] min-[761px]:top-[49.4%] min-[761px]:w-[9.2%] min-[761px]:z-[10]',
        motionClass: 'motion-hero-heart-float',
        duration: '7.6s',
        delay: '-0.2s',
    },
    {
        src: '/landing/sw-scene-item-sw-heart-4.webp',
        width: 108,
        height: 153,
        posClass:
            'absolute h-auto max-w-none left-[12.97%] top-[103.22%] w-[7.61%] z-[12] min-[761px]:left-[17.83%] min-[761px]:top-[87.98%] min-[761px]:w-[5%] min-[761px]:z-[10]',
        motionClass: 'motion-hero-heart-float',
        duration: '6s',
        delay: '-2.4s',
    },
    {
        src: '/landing/sw-scene-item-sw-heart-5.webp',
        width: 127,
        height: 176,
        posClass:
            'absolute h-auto max-w-none left-[73.08%] top-[66.76%] w-[4.5%] z-[12] min-[761px]:left-[67.36%] min-[761px]:top-[82.01%] min-[761px]:w-[4.5%] min-[761px]:z-[10]',
        motionClass: 'motion-hero-heart-float',
        duration: '7.6s',
        delay: '-1.1s',
    },
] as const;

const HERO_VISUAL_CLASS =
    'pointer-events-none relative z-10 order-2 left-[3.7vw] mt-[42px] aspect-[1136/1204] w-[137vw] max-w-none justify-self-center self-center min-[761px]:order-none min-[761px]:left-auto min-[761px]:m-0 min-[761px]:w-[min(780px,43vw)] min-[761px]:justify-self-start';

const PHONE_WRAP_CLASS =
    'absolute aspect-[748/1541] left-[19.28%] top-[3.78%] w-[56.47%] z-[5] min-[761px]:left-[23.5%] min-[761px]:top-[5.21%] min-[761px]:w-[43.7%]';

const PHONE_FEED_TRACK_CLASS = 'absolute top-0 left-[-2.85%] w-[105.65%] will-change-transform min-[761px]:w-[105.7%]';

const HERO_SPRITE_MOTION = {
    'motion-hero-drift-left': { x: [5, -7, 5], y: [3, -8, 3], rotate: [0.5, -0.6, 0.5] },
    'motion-hero-drift-right': { x: [-6, 8, -6], y: [3, -7, 3], rotate: [-0.5, 0.6, -0.5] },
    'motion-hero-float-strong': { x: [-4, 7, -4], y: [4, -14, 4], rotate: [-1.8, 3, -1.8], scale: [0.995, 1.022, 0.995] },
    'motion-hero-float-soft': { x: [-2, 5, -2], y: [3, -10, 3], rotate: [-0.9, 1.3, -0.9] },
    'motion-hero-pulse-flash': { x: [-2, 3, -2], y: [2, -8, 2], rotate: [-1.2, 1.8, -1.2], scale: [0.965, 1.045, 0.965] },
    'motion-hero-note-float': { x: [-4, 7, -4], y: [4, -14, 4], rotate: [-4.5, 5, -4.5], scale: [0.99, 1.035, 0.99] },
    'motion-hero-heart-float': { x: [-2, 5, -2], y: [3, -10, 3], rotate: [-1.2, 1.8, -1.2], scale: [0.985, 1.03, 0.985] },
} satisfies Record<(typeof HERO_SPRITES)[number]['motionClass'], TargetAndTransition>;

export function LandingHeroVisual() {
    const reduceMotion = useReducedMotion();
    const [firstSprite, ...restSprites] = HERO_SPRITES;

    return (
        <div aria-hidden="true" className={HERO_VISUAL_CLASS}>
            {/* Floating social post */}
            <motion.div
                animate={reduceMotion ? undefined : HERO_SPRITE_MOTION[firstSprite.motionClass]}
                className={firstSprite.posClass}
                transition={{ duration: Number.parseFloat(firstSprite.duration), ease: 'easeInOut', repeat: Infinity }}
            >
                <ProtectedImage alt="" className="h-auto w-full" height={firstSprite.height} src={firstSprite.src} width={firstSprite.width} />
            </motion.div>
            {/* Phone feed */}
            <motion.div
                animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                className={PHONE_WRAP_CLASS}
                transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
            >
                <div className="absolute top-[2.1%] right-[4.55%] bottom-[2.1%] left-[4.68%] z-[1] overflow-hidden rounded-[10.5%/4.8%] bg-white">
                    <motion.div
                        animate={reduceMotion ? undefined : { y: [0, -400, -400, 0] }}
                        className={PHONE_FEED_TRACK_CLASS}
                        transition={{ duration: 24, ease: 'easeInOut', repeat: Infinity, times: [0, 0.75, 0.85, 1] }}
                    >
                        <ProtectedImage
                            alt=""
                            className="relative block h-auto w-full max-w-none [&+&]:-mt-px"
                            height={2048}
                            src="/landing/sw-phone-feed-3.webp"
                            width={774}
                        />
                        <ProtectedImage
                            alt=""
                            className="relative block h-auto w-full max-w-none [&+&]:-mt-px"
                            height={2048}
                            src="/landing/sw-phone-feed.webp"
                            width={451}
                        />
                        <ProtectedImage
                            alt=""
                            className="relative block h-auto w-full max-w-none [&+&]:-mt-px"
                            height={2048}
                            src="/landing/sw-phone-feed-2.webp"
                            width={820}
                        />
                    </motion.div>
                </div>
                <ProtectedImage alt="" className="absolute inset-0 z-[2] h-auto w-full" height={1541} src="/landing/sw-phone-frame.webp" width={748} />
            </motion.div>
            {/* Surrounding reactions and posts */}
            {restSprites.map((sprite) => (
                <motion.div
                    animate={reduceMotion ? undefined : HERO_SPRITE_MOTION[sprite.motionClass]}
                    className={sprite.posClass}
                    key={sprite.src}
                    transition={{
                        duration: Number.parseFloat(sprite.duration),
                        ease: 'easeInOut',
                        repeat: Infinity,
                        delay: Number.parseFloat(sprite.delay),
                    }}
                >
                    <ProtectedImage alt="" className="h-auto w-full" height={sprite.height} src={sprite.src} width={sprite.width} />
                </motion.div>
            ))}
        </div>
    );
}
