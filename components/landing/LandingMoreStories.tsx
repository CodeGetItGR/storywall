import Image from 'next/image';

import { landingMoreStoryImages } from '@/lib/landingMedia';

export type LandingMoreStory = { alt: string; label: string; text: string };

type LandingMoreStoriesProps = {
    ariaLabel: string;
    eyebrow: string;
    heading: string;
    mobileHint: string;
    stories: LandingMoreStory[];
};

export function LandingMoreStories({ ariaLabel, eyebrow, heading, mobileHint, stories }: LandingMoreStoriesProps) {
    return (
        <div className="sw-filmstrip-more mt-16 block pt-7 pb-6 min-[761px]:mt-[clamp(74px,8vw,118px)] min-[761px]:grid min-[761px]:grid-cols-[minmax(220px,27%)_minmax(0,1fr)] min-[761px]:items-end min-[761px]:gap-[clamp(26px,4vw,64px)] min-[761px]:py-[clamp(34px,4vw,54px)_0_clamp(18px,2vw,28px)]">
            {/* Eyebrow + heading */}
            <div className="sw-filmstrip-intro pb-[22px] min-[761px]:pb-0">
                <div className="sw-filmstrip-eyebrow mb-[14px] text-[13px] font-black tracking-[0.16em] text-[var(--ink)]">{eyebrow}</div>
                <h3 className="m-0 max-w-[280px] text-[42px] leading-[0.92] font-normal tracking-[-0.05em] text-[var(--ink)] [font-family:var(--editorial)] min-[761px]:max-w-[300px] min-[761px]:text-[clamp(38px,4.5vw,68px)]">
                    {heading}
                </h3>
            </div>
            {/* Filmstrip */}
            <div
                aria-label={ariaLabel}
                className="sw-filmstrip-track ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] flex h-[230px] w-screen gap-1.5 overflow-x-auto overflow-y-hidden pr-[18%] [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[761px]:ml-0 min-[761px]:mr-0 min-[761px]:grid min-[761px]:h-[clamp(180px,17vw,255px)] min-[761px]:w-auto min-[761px]:grid-cols-5 min-[761px]:gap-[3px] min-[761px]:overflow-hidden min-[761px]:rounded-[36px_0_36px_0] min-[761px]:pr-0"
            >
                {stories.map((story, index) => (
                    <button
                        aria-pressed={index === 0}
                        className="sw-filmstrip-card group relative h-full min-w-0 flex-[0_0_28%] [scroll-snap-align:start] cursor-pointer appearance-none overflow-hidden border-0 bg-[#111] p-0 transition-[flex-basis] duration-[550ms] ease-[cubic-bezier(0.2,0.75,0.2,1)] aria-pressed:flex-[0_0_72%] min-[761px]:h-full min-[761px]:flex-none"
                        data-caption-text={story.text}
                        data-caption-title={story.label}
                        data-film-index={index}
                        key={story.label}
                        type="button"
                    >
                        <Image
                            alt={story.alt}
                            className="absolute inset-0 h-full w-full scale-[1.035] object-cover brightness-[0.76] grayscale transition-[filter,transform] duration-[650ms] ease-[cubic-bezier(0.2,0.75,0.2,1)] group-aria-pressed:scale-[1.01] group-aria-pressed:grayscale-0 group-aria-pressed:brightness-100 min-[761px]:brightness-[0.78] min-[761px]:hover:scale-[1.01] min-[761px]:hover:grayscale-0 min-[761px]:hover:brightness-100"
                            height={1}
                            src={landingMoreStoryImages[index]}
                            unoptimized
                            width={1}
                        />
                        <span
                            aria-hidden="true"
                            className="sw-filmstrip-plus absolute top-[9px] right-[9px] z-2 grid size-6 place-items-center rounded-full border border-white/90 bg-black/18 text-[16px] leading-none text-white backdrop-blur-[4px] min-[761px]:top-[10px] min-[761px]:right-[10px] min-[761px]:size-[25px] min-[761px]:text-[17px]"
                        >
                            +
                        </span>
                        <span className="sw-filmstrip-name absolute bottom-[9px] left-[9px] right-1.5 z-2 text-left text-[7.5px] font-black tracking-[0.11em] text-white uppercase min-[761px]:bottom-[10px] min-[761px]:left-[10px] min-[761px]:right-2 min-[761px]:text-[8px]">
                            {story.label}
                        </span>
                    </button>
                ))}
            </div>
            {/* Caption */}
            <div aria-live="polite" className="sw-filmstrip-caption group mt-4 block min-h-[76px] text-[var(--ink)] min-[761px]:col-start-2 min-[761px]:mt-5 min-[761px]:flex min-[761px]:min-h-0 min-[761px]:items-baseline min-[761px]:gap-5">
                <strong className="sw-filmstrip-caption-title mb-2 block text-[11px] font-black tracking-[0.12em] uppercase min-[761px]:mb-0 min-[761px]:inline min-[761px]:shrink-0 min-[761px]:text-[12px]">
                    {stories[0]?.label}
                </strong>
                <span className="sw-filmstrip-caption-text block max-w-[96%] text-[16px] leading-[1.45] text-[var(--ink)] transition-[opacity,transform] duration-[180ms] ease-in-out group-data-[changing=true]:translate-y-[3px] group-data-[changing=true]:opacity-0 min-[761px]:max-w-none min-[761px]:text-[18px]">
                    {stories[0]?.text}
                </span>
            </div>
            <div className="sw-filmstrip-mobile-hint mt-3 text-[9px] font-extrabold tracking-[0.14em] text-[var(--ink)] min-[761px]:hidden">{mobileHint}</div>
        </div>
    );
}
