import type { WeddingStatCopy } from '@/lib/occasions/weddingCopy';

type WhyStatsProps = { chips: string[]; example: string; stats: WeddingStatCopy[] };

// One example wedding in numbers, then the four points.
export function WhyStats({ chips, example, stats }: WhyStatsProps) {
    return (
        <>
            {/* Example */}
            <p className="mt-2.5 mb-0 text-center text-[10px] font-extrabold tracking-[0.16em] text-[#8a857f] uppercase">{example}</p>
            {/* Numbers */}
            <ul className="m-0 mt-2.5 grid list-none grid-cols-2 gap-x-2 gap-y-5 p-0 min-[601px]:gap-x-8.5 min-[861px]:flex min-[861px]:justify-center min-[861px]:gap-[clamp(28px,5vw,70px)]">
                {stats.map((stat) => (
                    <li className="text-center text-[11px] font-bold tracking-[0.14em] text-[#8a857f] uppercase" key={stat.label}>
                        <span className="mb-2.5 block [background-image:var(--brand-gradient)] bg-clip-text [font-family:var(--editorial)] text-[clamp(56px,5.2vw,78px)] leading-none font-normal tracking-[-0.04em] text-transparent">
                            {stat.value}
                        </span>
                        {stat.label}
                    </li>
                ))}
            </ul>
            {/* Points */}
            <ul className="mx-auto mt-8 mb-0 grid max-w-85 list-none grid-cols-1 gap-3.5 px-5 min-[561px]:max-w-275 min-[561px]:grid-cols-2 min-[561px]:gap-6 min-[901px]:grid-cols-4">
                {chips.map((chip) => (
                    <li
                        className="flex items-center gap-3 [font-family:var(--editorial)] text-[17px] leading-[1.3] text-[#151313] min-[561px]:text-[18px]"
                        key={chip}
                    >
                        {/* A check drawn as a rotated corner in a green circle */}
                        <span aria-hidden="true" className="relative size-9 flex-none rounded-full bg-[#e4f0e1]">
                            <span className="absolute top-2 left-[13px] h-[15px] w-2 rotate-45 border-r-[2.5px] border-b-[2.5px] border-solid border-[#2a6834]" />
                        </span>
                        {chip}
                    </li>
                ))}
            </ul>
        </>
    );
}
