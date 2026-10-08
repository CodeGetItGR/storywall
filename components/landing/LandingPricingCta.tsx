import { type LandingPlan, pickedLandingDuration } from '@/lib/landingPricing';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

// eventType: the slug of the event type the pricing shows; durationId: the one picked on the card.
type LandingPricingCtaProps = { className?: string; label: string; eventType: string; plan: LandingPlan; durationId: string | undefined };

// One plan card's button: opens the creation form on its details step with the card's type, plan and
// duration picked. The proxy sends signed-out visitors through login with this destination in `next`.
export function LandingPricingCta({ className, label, eventType, plan, durationId }: LandingPricingCtaProps) {
    const option = pickedLandingDuration(plan, durationId).id;

    return (
        <a
            className={cn(
                'items-center justify-center gap-3 rounded-full bg-[#151313] px-6 py-3.5 text-[11px] font-black tracking-[0.08em] text-white uppercase no-underline focus-ring transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4 motion-reduce:transition-none min-[761px]:px-7 min-[761px]:text-[13px] min-[761px]:tracking-widest',
                className,
            )}
            href={routes.events.new({ step: 'details', type: eventType, plan: plan.code, option })}
        >
            <span>
                {label}
                <span className="sr-only"> · {plan.name}</span>
            </span>
            <span aria-hidden="true" className="text-[18px] leading-none">
                ↗
            </span>
        </a>
    );
}
