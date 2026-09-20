import { ProtectedImage } from '@/components/common/ProtectedImage';
type LandingFeatureDetailCardProps = {
    description: string;
    imageAlt: string;
    imagePath: string;
    items: string[];
    subtitle: string;
    title: string;
};

export function LandingFeatureDetailCard({ description, imageAlt, imagePath, items, subtitle, title }: LandingFeatureDetailCardProps) {
    return (
        <article className="group flex h-[900px] snap-start flex-col overflow-hidden rounded-[24px] bg-[#101014] ring-1 ring-white/12 transition-[transform,background-color] duration-300 hover:-translate-y-1 hover:bg-white/[0.08] motion-reduce:transition-none min-[761px]:h-[860px] min-[1440px]:h-[940px]">
            {/* Feature image */}
            <div className="relative h-[400px] shrink-0 overflow-hidden min-[761px]:h-[450px] min-[1440px]:h-[520px]">
                <ProtectedImage
                    alt={imageAlt}
                    className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035] motion-reduce:transition-none"
                    height={900}
                    loading="lazy"
                    sizes="(max-width: 760px) 84vw, (max-width: 1440px) 50vw, 25vw"
                    src={imagePath}
                    width={1200}
                />
            </div>

            {/* Feature details */}
            <div className="flex flex-1 flex-col px-6 pt-7 pb-8 min-[761px]:px-7 min-[761px]:pt-8">
                <h3 className="max-w-[19rem] font-[var(--editorial)] text-[clamp(40px,3.2vw,55px)] leading-[0.9] tracking-[-0.045em] text-white">
                    {title}
                </h3>
                <p className="mt-5 text-[16px] leading-[1.35] font-black text-[#f2c66a]">{subtitle}</p>
                <p className="mt-5 text-[15px] leading-[1.55] text-white/82">{description}</p>
                <ul className="mt-auto space-y-2.5 border-t border-white/14 pt-6 text-[13px] leading-[1.4] font-semibold text-white/90">
                    {items.map((item) => (
                        <li
                            className="relative pl-4 before:absolute before:top-[0.48em] before:left-0 before:size-1 before:rounded-full before:bg-[#f2c66a] before:content-['']"
                            key={item}
                        >
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </article>
    );
}
