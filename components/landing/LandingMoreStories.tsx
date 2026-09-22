import { ProtectedImage } from '@/components/common/ProtectedImage';
import { landingMoreStoryMedia } from '@/lib/landingMedia';

export type LandingMoreStory = { alt: string; label: string; text: string };

type LandingMoreStoriesProps = {
    ariaLabel: string;
    eyebrow: string;
    heading: string;
    stories: LandingMoreStory[];
};

export function LandingMoreStories({ ariaLabel, eyebrow, heading, stories }: LandingMoreStoriesProps) {
    return (
        <div className="sw-filmstrip-more mt-16 block pt-7 px-5 min-[761px]:px-18 pb-6 min-[761px]:mt-[clamp(74px,8vw,118px)] min-[761px]:grid min-[761px]:grid-cols-[minmax(220px,27%)_minmax(0,1fr)] min-[761px]:items-end min-[761px]:gap-[clamp(26px,4vw,64px)] min-[761px]:py-[clamp(34px,4vw,54px)_0_clamp(18px,2vw,28px)]">
            {/* Eyebrow + heading */}
            <div className="sw-filmstrip-intro pb-5.5 min-[761px]:pb-0">
                <div className="sw-filmstrip-eyebrow mb-3.5 text-[13px] font-black tracking-[0.16em] text-ink">{eyebrow}</div>
                <h3 className="m-0 max-w-70 text-[42px] leading-[0.92] font-normal tracking-tighter text-ink [font-family:var(--editorial)] min-[761px]:max-w-75 min-[761px]:text-[clamp(38px,4.5vw,68px)]">
                    {heading}
                </h3>
            </div>
            {/* Filmstrip */}
            <div
                aria-label={ariaLabel}
                className="sw-filmstrip-track flex h-[clamp(205px,62vw,250px)] w-[calc(100vw-20px)] max-w-none gap-1 overflow-hidden rounded-tl-[30px] min-[761px]:h-[clamp(180px,17vw,255px)] min-[761px]:w-auto min-[761px]:gap-0.75 min-[761px]:rounded-[36px_0_36px_0]"
            >
                {stories.map((story, index) => (
                    <button
                        aria-pressed={index === 0}
                        className="sw-filmstrip-card group relative h-full min-w-0 flex-[1_1_0%] cursor-pointer appearance-none overflow-hidden border-0 bg-[#111] p-0 transition-[flex-grow] duration-400 ease-[cubic-bezier(0.2,0.75,0.2,1)] aria-pressed:flex-[4_1_0%] min-[480px]:aria-pressed:flex-[3_1_0%] min-[761px]:aria-pressed:flex-[1.85_1_0%]"
                        data-caption-text={story.text}
                        data-caption-title={story.label}
                        data-film-index={index}
                        key={story.label}
                        type="button"
                    >
                        <ProtectedImage
                            unoptimized
                            alt={story.alt}
                            className="absolute inset-0 h-full w-full object-cover brightness-[0.76] grayscale transition-[filter,transform] duration-650 ease-[cubic-bezier(0.2,0.75,0.2,1)] group-aria-pressed:grayscale-0 group-aria-pressed:brightness-100 min-[761px]:brightness-[0.78] min-[761px]:hover:scale-[1.01] min-[761px]:hover:grayscale-0 min-[761px]:hover:brightness-100"
                            height={1}
                            src={landingMoreStoryMedia[index].src}
                            style={{ objectPosition: landingMoreStoryMedia[index].objectPosition }}
                            loading="lazy"
                            width={1}
                        />
                        <span
                            aria-hidden="true"
                            className="sw-filmstrip-plus absolute top-2.25 right-2.25 z-2 grid size-6 place-items-center rounded-full border border-white/90 bg-black/18 text-[16px] leading-none text-white backdrop-blur-xs min-[761px]:top-2.5 min-[761px]:right-2.5 min-[761px]:size-6.25 min-[761px]:text-[17px]"
                        >
                            +
                        </span>
                        <span className="sw-filmstrip-name absolute right-1.5 bottom-2.25 left-2.25 z-2 text-left text-[8px] font-black tracking-[0.11em] text-white uppercase opacity-0 transition-opacity duration-200 group-aria-pressed:opacity-100 min-[761px]:right-2 min-[761px]:bottom-2.5 min-[761px]:left-2.5 min-[761px]:opacity-100">
                            {story.label}
                        </span>
                    </button>
                ))}
            </div>
            {/* Caption */}
            <div
                aria-live="polite"
                className="sw-filmstrip-caption group mt-4 block min-h-19 text-ink min-[761px]:col-start-2 min-[761px]:mt-5 min-[761px]:flex min-[761px]:min-h-0 min-[761px]:items-baseline min-[761px]:gap-5"
            >
                <strong className="sw-filmstrip-caption-title mb-2 block text-[11px] font-black tracking-[0.12em] uppercase min-[761px]:mb-0 min-[761px]:inline min-[761px]:shrink-0 min-[761px]:text-[12px]">
                    {stories[0]?.label}
                </strong>
                <span className="sw-filmstrip-caption-text block max-w-[96%] text-[16px] leading-[1.45] text-ink transition-[opacity,transform] duration-180 ease-in-out group-data-[changing=true]:translate-y-0.75 group-data-[changing=true]:opacity-0 min-[761px]:max-w-none min-[761px]:text-[18px]">
                    {stories[0]?.text}
                </span>
            </div>
        </div>
    );
}
