import type { LandingHeroMainAction } from '@/lib/landingHero';
import { landingClickAttributes } from '@/lib/landingTracking';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const BUTTON =
    'flex h-12 items-center justify-between gap-2 rounded-full pr-1.5 pl-4 font-[Baskerville,Georgia,serif] text-[17px] leading-none tracking-tight whitespace-nowrap focus-ring transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4 motion-reduce:transition-none min-[761px]:h-13 min-[761px]:gap-5 min-[761px]:pr-2 min-[761px]:pl-6 min-[761px]:text-[18px]';
const ARROW = 'grid size-8 shrink-0 place-items-center rounded-full text-[18px] leading-none min-[761px]:size-9 min-[761px]:text-[22px]';

type LandingHeroActionsProps = {
    main: LandingHeroMainAction;
    mainLabel: string;
    demoLabel: string;
};

export function LandingHeroActions({ main, mainLabel, demoLabel }: LandingHeroActionsProps) {
    return (
        <div className="mt-7 flex flex-row flex-wrap gap-2 min-[761px]:mt-9 min-[761px]:gap-3">
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

            {/* Demo: the arrow shows from desktop up so both buttons fit one phone row */}
            <a
                className={cn(BUTTON, 'border border-[#151313]/20 bg-white/85 pr-4 text-[#151313] min-[761px]:pr-2')}
                href={routes.demo}
                {...landingClickAttributes({ event: 'demo', placement: 'hero' })}
            >
                <span>{demoLabel}</span>
                <span aria-hidden="true" className={cn(ARROW, 'hidden text-[#ee9971] min-[761px]:grid')}>
                    ↗
                </span>
            </a>
        </div>
    );
}
