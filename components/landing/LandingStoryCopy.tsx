import { Fragment } from 'react';

export type LandingTextSegment = { strong?: boolean; text: string };

type LandingStoryCopyProps = {
    paragraphSegments: LandingTextSegment[][];
    tag: string;
    titleSegments: LandingTextSegment[];
    wide: boolean;
};

export function LandingStoryCopy({ paragraphSegments, tag, titleSegments, wide }: LandingStoryCopyProps) {
    return (
        <div className="story-copy min-w-0">
            <span className="mb-3.5 block w-max max-w-full bg-[linear-gradient(135deg,#d27b9b_0%,#e78274_28%,#f4905f_58%,#fcba63_100%)] bg-clip-text text-[13px] leading-[1.15] font-black tracking-[0.12em] text-transparent min-[761px]:mb-[24px] min-[761px]:text-[clamp(16px,1.35vw,22px)] min-[761px]:tracking-[0.13em]">
                {tag}
            </span>
            <h3 className="m-0 max-w-none text-[clamp(28px,8.6vw,44px)] leading-[0.95] font-normal tracking-[-0.05em] text-pretty [font-family:var(--editorial)] min-[761px]:max-w-[780px] min-[761px]:text-[clamp(42px,5vw,82px)] min-[761px]:leading-[0.92] min-[761px]:tracking-[-0.055em] min-[761px]:text-balance">
                {titleSegments.map((segment, index) => (
                    <Fragment key={`${segment.text}-${index}`}>{segment.strong ? <strong className="font-bold">{segment.text}</strong> : segment.text}</Fragment>
                ))}
            </h3>
            <p className="mt-3.5 max-w-none text-[15px] leading-[1.55] text-pretty text-[var(--ink)] min-[761px]:mt-[22px] min-[761px]:max-w-[580px] min-[761px]:text-[clamp(14px,1.15vw,17px)] min-[761px]:leading-[1.6] min-[761px]:text-wrap">
                {paragraphSegments[0]?.map((segment, index) => (
                    <Fragment key={`${segment.text}-${index}`}>{segment.strong ? <strong className="font-bold">{segment.text}</strong> : segment.text}</Fragment>
                ))}
            </p>
            {paragraphSegments[1] ? (
                <div className={`story-extra mt-5 min-[761px]:mt-[clamp(24px,2.6vw,38px)] ${wide ? 'max-w-full min-[761px]:max-w-[760px]' : 'max-w-full min-[761px]:max-w-[720px]'}`}>
                    <p
                        className={`m-0 mb-[15px] text-[15px] leading-[1.45] text-[var(--ink)] min-[761px]:mb-[18px] min-[761px]:text-[clamp(15px,1.1vw,18px)] min-[761px]:leading-[1.5] ${wide ? 'max-w-full min-[761px]:max-w-[720px]' : 'max-w-full min-[761px]:max-w-[680px]'}`}
                    >
                        {paragraphSegments[1].map((segment, index) => (
                            <Fragment key={`${segment.text}-${index}`}>{segment.strong ? <strong className="font-bold">{segment.text}</strong> : segment.text}</Fragment>
                        ))}
                    </p>
                </div>
            ) : null}
        </div>
    );
}
