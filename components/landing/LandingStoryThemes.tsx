import { LandingThemeTile } from '@/components/landing/LandingThemeTile';
import type { LandingTheme } from '@/lib/landingThemes';
import { landingClickAttributes } from '@/lib/landingTracking';
import { routes } from '@/lib/routes';

export type LandingStoryThemesCopy = {
    cta: string;
    eyebrow: string;
    heading: string;
    intro: string;
    listLabel: string;
};

type LandingStoryThemesProps = {
    copy: LandingStoryThemesCopy;
    themes: LandingTheme[];
};

// The theme presets for a story row's event type, under the row's photo and copy.
export function LandingStoryThemes({ copy, themes }: LandingStoryThemesProps) {
    return (
        <div className="mt-10 px-5 min-[761px]:col-span-full min-[761px]:row-2 min-[761px]:mt-[clamp(56px,6vw,96px)] min-[761px]:pr-[clamp(22px,4vw,72px)] min-[761px]:pl-0">
            {/* Eyebrow + heading */}
            <div className="text-[13px] leading-[1.4] font-extrabold tracking-[0.14em] text-[#e97a6f] uppercase">{copy.eyebrow}</div>
            <h3 className="mt-3 mb-0 [font-family:var(--editorial)] text-[clamp(34px,9vw,44px)] leading-[0.98] font-normal tracking-[-0.045em] text-balance text-ink min-[761px]:mt-4 min-[761px]:max-w-[16em] min-[761px]:text-[clamp(44px,4.4vw,72px)]">
                {copy.heading}
            </h3>
            <p className="mt-4 max-w-165 text-[16px] leading-[1.55] text-ink-muted min-[761px]:mt-5 min-[761px]:text-[clamp(16px,1.3vw,20px)]">
                {copy.intro}
            </p>
            {/* Tiles */}
            <ul
                aria-label={copy.listLabel}
                className="-mx-5 mt-7 no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 min-[761px]:mx-0 min-[761px]:mt-10 min-[761px]:grid min-[761px]:grid-cols-[repeat(6,minmax(0,190px))] min-[761px]:gap-[clamp(10px,1vw,16px)] min-[761px]:overflow-visible min-[761px]:px-0"
            >
                {themes.map((theme) => (
                    <LandingThemeTile key={theme.id} theme={theme} />
                ))}
            </ul>
            {/* Call to action */}
            <div className="mt-8 flex justify-center min-[761px]:mt-12 min-[761px]:justify-start">
                <a
                    className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(100deg,#ff6f93,#ff936a_52%,#ffb25b)] px-5 text-center text-[14px] leading-tight font-semibold text-white! no-underline shadow-[0_16px_32px_rgba(217,102,74,.15)] focus-ring transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4 motion-reduce:transition-none min-[761px]:w-auto min-[761px]:min-w-105 min-[761px]:text-[16px]"
                    href={routes.events.new()}
                    {...landingClickAttributes({ event: 'create', placement: 'themes' })}
                >
                    <span>{copy.cta}</span>
                    <span aria-hidden="true">→</span>
                </a>
            </div>
        </div>
    );
}
