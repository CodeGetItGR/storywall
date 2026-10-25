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
            <ul className="m-0 mt-6.5 flex list-none flex-wrap justify-center gap-2 px-2 min-[601px]:gap-2.5 min-[601px]:px-5">
                {chips.map((chip) => (
                    <li
                        className="rounded-full bg-white px-4 py-2.5 text-[11px] leading-[1.4] font-semibold min-[601px]:text-[13px] min-[601px]:leading-normal"
                        key={chip}
                    >
                        <span aria-hidden="true">✓ </span>
                        {chip}
                    </li>
                ))}
            </ul>
        </>
    );
}
