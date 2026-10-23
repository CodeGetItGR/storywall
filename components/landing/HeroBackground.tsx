import Image from 'next/image';

// The hero's background, and usually its largest paint. An img in the HTML starts downloading as the
// page arrives; a CSS background or a high-priority preload() waits for the stylesheet or is dropped.
export function HeroBackground() {
    return (
        <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full object-cover object-center select-none"
            draggable={false}
            fetchPriority="high"
            height={1137}
            loading="eager"
            src="/landing/hero-background-v75.webp"
            unoptimized
            width={2048}
        />
    );
}
