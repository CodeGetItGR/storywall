import React from 'react';

type LandingFeatureItemProps = {
    iconPath: string;
    label: string;
    clone?: boolean;
    position: number;
};

function iconAnimationDelay(position: number) {
    const n = position + 1;
    let delay: string | undefined;
    if (n % 2 === 0) delay = '-1.3s';
    if (n % 3 === 0) delay = '-2.4s';
    if (n % 5 === 0) delay = '-3.2s';
    return delay;
}

export function LandingFeatureItem({ clone = false, iconPath, label, position }: LandingFeatureItemProps) {
    return (
        <div
            aria-hidden={clone || undefined}
            className={`sw-feature-item group${clone ? ' sw-marquee-clone min-[761px]:hidden' : ''} min-w-0 flex-[0_0_118px] text-center min-[761px]:max-w-[170px] min-[761px]:min-w-0 min-[761px]:flex-[0_0_calc((100%-6*clamp(24px,2.2vw,34px))/7)]`}
            role="listitem"
            tabIndex={clone ? -1 : undefined}
        >
            <div
                className="motion-feature-icon mx-auto mb-3 grid size-[76px] place-items-center min-[761px]:mb-[14px] min-[761px]:size-[clamp(78px,6vw,98px)]"
                style={{ animationDelay: iconAnimationDelay(position) }}
            >
                <span
                    aria-hidden="true"
                    className="block size-full bg-[linear-gradient(135deg,#f89ab0_0%,#f6a18f_34%,#f4b37b_68%,#f3cf8a_100%)] [-webkit-mask-image:var(--sw-icon-mask)] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] [mask-image:var(--sw-icon-mask)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [transform:translateZ(0)] [transition:transform_0.32s_cubic-bezier(0.2,0.75,0.2,1),filter_0.32s_ease] [filter:drop-shadow(0_4px_8px_rgba(230,126,105,0.14))] group-hover:[transform:translateY(-2px)_scale(1.025)] group-hover:[filter:drop-shadow(0_7px_11px_rgba(230,126,105,0.2))] motion-reduce:transition-none"
                    style={{ '--sw-icon-mask': `url('${iconPath}')` } as React.CSSProperties}
                />
            </div>
            <div className="mx-auto max-w-32 text-[12px] leading-[1.25] font-light tracking-normal text-white/86 [font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] min-[761px]:max-w-[165px] min-[761px]:text-center min-[761px]:text-[clamp(13px,0.9vw,15px)]">
                {label}
            </div>
        </div>
    );
}
