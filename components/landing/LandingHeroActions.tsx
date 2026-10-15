import type { LandingHeroMainAction } from '@/lib/landingHero';
import { landingClickAttributes } from '@/lib/landingTracking';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const BUTTON =
    'flex h-14 items-center justify-between gap-4 rounded-full pr-2 pl-6 font-[Baskerville,Georgia,serif] text-[20px] leading-none tracking-tight whitespace-nowrap focus-ring transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4 motion-reduce:transition-none min-[761px]:h-13 min-[761px]:gap-5 min-[761px]:text-[18px]';
const ARROW = 'grid size-10 shrink-0 place-items-center rounded-full text-[22px] leading-none min-[761px]:size-9';

type LandingHeroActionsProps = {
    main: LandingHeroMainAction;
    mainLabel: string;
    demoLabel: string;
};

export function LandingHeroActions({ main, mainLabel, demoLabel }: LandingHeroActionsProps) {
    return (
        <div className="mt-7 flex flex-col gap-3 min-[761px]:mt-9 min-[761px]:flex-row">
            {/* Main action */}
            <a
                className={cn(
                    BUTTON,
                    'bg-[linear-gradient(100deg,#ff6f93,#ff936a_52%,#ffd05b)] text-white shadow-[0_16px_32px_rgba(217,102,74,.15)]',
                )}
                href={main.href}
                {...landingClickAttributes(main.click)}
            >
                <span>{mainLabel}</span>
                <span aria-hidden="true" className={cn(ARROW, 'bg-white text-[#ee9971]')}>
                    {main.arrow}
                </span>
            </a>

            {/* Demo */}
            <a
                className={cn(BUTTON, 'border border-[#151313]/20 bg-white/85 text-[#151313]')}
                href={routes.demo}
                {...landingClickAttributes({ event: 'demo', placement: 'hero' })}
            >
                <span>{demoLabel}</span>
                <span aria-hidden="true" className={cn(ARROW, 'text-[#ee9971]')}>
                    ↗
                </span>
            </a>
        </div>
    );
}
