type LandingPricingCardProps = {
    chooseLabel: string;
    description: string;
    features: string[];
    featured: boolean;
    name: string;
    popularLabel: string;
    price: string;
};

export function LandingPricingCard({ chooseLabel, description, featured, features, name, popularLabel, price }: LandingPricingCardProps) {
    return (
        <article className="relative mb-[42px] flex min-h-0 flex-col pt-[18px] last:mb-0 min-[761px]:mb-0 min-[761px]:min-h-[545px] min-[761px]:pt-[22px]">
            <div className="pr-28 text-lg leading-[1.08] font-black tracking-[0.085em] min-[761px]:pr-[8vw] min-[761px]:text-[1.35vw] min-[761px]:tracking-[0.1em]">
                {name}{' '}
                {featured ? (
                    <span className="block text-[8px] leading-none font-bold tracking-[0.1em] min-[761px]:text-[9px] min-[761px]:tracking-[0.12em]">
                        {popularLabel}
                    </span>
                ) : null}
            </div>
            <div className="absolute top-3.5 right-0 bg-[linear-gradient(110deg,#d889a0_0%,#e98778_28%,#f39a63_58%,#f5b967_100%)] bg-clip-text [font-family:var(--editorial)] text-[54px] leading-[0.82] font-normal tracking-[-0.05em] text-transparent min-[761px]:top-4 min-[761px]:text-[3.3vw]">
                {price}
            </div>
            <p className="mt-[72px] min-h-0 max-w-[92%] text-sm leading-[1.55] min-[761px]:mt-[92px] min-[761px]:min-h-[50px] min-[761px]:max-w-[340px] min-[761px]:text-[15px]">
                {description}
            </p>
            <ul className="mt-6 mb-6 list-none pt-3.5 min-[761px]:mt-[26px]">
                {features.map((feature) => (
                    <li className="relative py-[11px] pl-6 text-sm leading-[1.45] before:absolute before:left-0 before:content-['✓']" key={feature}>
                        {feature}
                    </li>
                ))}
            </ul>
            <a
                className={`mt-auto flex min-h-[50px] items-center justify-between gap-[18px] rounded-full px-[18px] text-[10px] leading-[1.5] font-black tracking-[0.13em] transition-[color,padding,background,transform] duration-[280ms] min-[761px]:min-h-12 ${
                    featured
                        ? 'border-0 bg-[linear-gradient(135deg,#d27b9b_0%,#e78274_24%,#f4905f_48%,#f8a560_72%,#fcba63_100%)] text-white'
                        : 'border border-[rgb(21_19_19/28%)] text-[#151313]'
                }`}
                href="#"
            >
                <span>{chooseLabel}</span>
                <span>→</span>
            </a>
        </article>
    );
}
