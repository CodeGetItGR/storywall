import Image from 'next/image';

const HERO_ASSETS = [
    ['sw-scene-item sw-post-1', '/landing/sw-scene-item-sw-post-1.png', 696, 612],
    ['sw-scene-item sw-post-2', '/landing/sw-scene-item-sw-post-2.png', 624, 677],
    ['sw-scene-item sw-comment-1', '/landing/sw-scene-item-sw-comment-1.png', 705, 360],
    ['sw-scene-item sw-comment-2', '/landing/sw-scene-item-sw-comment-2.png', 557, 300],
    ['sw-scene-item sw-love', '/landing/sw-scene-item-sw-love.png', 441, 440],
    ['sw-scene-item sw-happy', '/landing/sw-scene-item-sw-happy.png', 240, 281],
    ['sw-scene-item sw-fire', '/landing/sw-scene-item-sw-fire.png', 165, 231],
    ['sw-scene-item sw-flash', '/landing/sw-scene-item-sw-flash.png', 124, 181],
    ['sw-scene-item sw-glasses', '/landing/sw-scene-item-sw-glasses.png', 253, 331],
    ['sw-scene-item sw-note', '/landing/sw-scene-item-sw-note.png', 241, 324],
    ['sw-scene-item sw-celebrate', '/landing/sw-scene-item-sw-celebrate.png', 171, 269],
    ['sw-scene-item sw-heart-1', '/landing/sw-scene-item-sw-heart-1.png', 111, 155],
    ['sw-scene-item sw-heart-2', '/landing/sw-scene-item-sw-heart-2.png', 167, 219],
    ['sw-scene-item sw-heart-3', '/landing/sw-scene-item-sw-heart-3.png', 200, 243],
    ['sw-scene-item sw-heart-4', '/landing/sw-scene-item-sw-heart-4.png', 108, 153],
    ['sw-scene-item sw-heart-5', '/landing/sw-scene-item-sw-heart-5.png', 127, 176],
] as const;

export function LandingHeroVisual() {
    const [firstClassName, firstSrc, firstWidth, firstHeight] = HERO_ASSETS[0];

    return (
        <div aria-hidden="true" className="sw-new-hero-visual">
            <Image alt="" className={firstClassName} height={firstHeight} src={firstSrc} unoptimized width={firstWidth} />
            <div className="sw-phone-wrap">
                <div className="sw-phone-screen">
                    <div className="sw-phone-feed-track">
                        <Image alt="" className="sw-phone-feed" height={2048} src="/landing/sw-phone-feed.jpg" unoptimized width={451} />
                        <Image alt="" className="sw-phone-feed" height={2048} src="/landing/sw-phone-feed-2.jpg" unoptimized width={820} />
                        <Image alt="" className="sw-phone-feed" height={2048} src="/landing/sw-phone-feed-3.jpg" unoptimized width={774} />
                    </div>
                </div>
                <Image alt="" className="sw-phone-frame" height={1541} src="/landing/sw-phone-frame.png" unoptimized width={748} />
            </div>
            {HERO_ASSETS.slice(1).map(([className, src, width, height]) => (
                <Image alt="" className={className} height={height} key={src} src={src} unoptimized width={width} />
            ))}
        </div>
    );
}
