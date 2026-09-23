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
        <article className="flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#101014]">
            {/* Feature image */}
            <div className="aspect-[0.69] shrink-0 overflow-hidden">
                <ProtectedImage
                    unoptimized
                    alt={imageAlt}
                    className="size-full object-cover"
                    height={900}
                    loading="lazy"
                    src={imagePath}
                    width={1200}
                />
            </div>

            {/* Feature details */}
            <div className="flex flex-1 flex-col px-7 pt-7 pb-8">
                <h3 className="max-w-[19rem] text-[clamp(40px,3.2vw,55px)] leading-[0.9] font-(--editorial) tracking-[-0.045em] text-white">
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
