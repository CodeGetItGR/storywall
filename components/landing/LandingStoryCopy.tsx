import { Fragment } from 'react';

import { landingClickAttributes } from '@/lib/landingTracking';
import { cn } from '@/lib/utils';

const PILL =
    'inline-flex items-center rounded-full px-6 py-3.5 text-[11px] font-black tracking-[0.08em] uppercase no-underline focus-ring transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4 motion-reduce:transition-none min-[761px]:px-7 min-[761px]:text-[13px] min-[761px]:tracking-widest';

export type LandingTextSegment = { strong?: boolean; text: string };

type LandingStoryCopyProps = {
    demo?: { href: string; label: string };
    more?: { href: string; label: string };
    paragraphSegments: LandingTextSegment[][];
    tag: string;
    titleSegments: LandingTextSegment[];
    wide: boolean;
};

export function LandingStoryCopy({ demo, more, paragraphSegments, tag, titleSegments, wide }: LandingStoryCopyProps) {
    return (
        <div className="story-copy min-w-0">
            <span className="mb-3.5 block w-max max-w-full bg-[linear-gradient(135deg,#d27b9b_0%,#e78274_28%,#f4905f_58%,#fcba63_100%)] bg-clip-text text-[13px] leading-[1.15] font-black tracking-[0.12em] text-transparent min-[761px]:mb-[24px] min-[761px]:text-[clamp(16px,1.35vw,22px)] min-[761px]:tracking-[0.13em]">
                {tag}
            </span>
            <h3 className="m-0 max-w-none [font-family:var(--editorial)] text-[clamp(28px,8.6vw,44px)] leading-[0.95] font-normal tracking-[-0.05em] text-pretty min-[761px]:max-w-[780px] min-[761px]:text-[clamp(42px,5vw,82px)] min-[761px]:leading-[0.92] min-[761px]:tracking-[-0.055em] min-[761px]:text-balance">
                {titleSegments.map((segment, index) => (
                    <Fragment key={`${segment.text}-${index}`}>
                        {segment.strong ? <strong className="font-bold">{segment.text}</strong> : segment.text}
                    </Fragment>
                ))}
            </h3>
            <p className="mt-3.5 max-w-none text-[15px] leading-[1.55] text-pretty text-[var(--ink)] min-[761px]:mt-[22px] min-[761px]:max-w-[580px] min-[761px]:text-[clamp(14px,1.15vw,17px)] min-[761px]:leading-[1.6] min-[761px]:text-wrap">
                {paragraphSegments[0]?.map((segment, index) => (
                    <Fragment key={`${segment.text}-${index}`}>
                        {segment.strong ? <strong className="font-bold">{segment.text}</strong> : segment.text}
                    </Fragment>
                ))}
            </p>
            {paragraphSegments[1] ? (
                <div
                    className={`story-extra mt-5 min-[761px]:mt-[clamp(24px,2.6vw,38px)] ${wide ? 'max-w-full min-[761px]:max-w-[760px]' : 'max-w-full min-[761px]:max-w-[720px]'}`}
                >
                    <p
                        className={`m-0 mb-[15px] text-[15px] leading-[1.45] text-[var(--ink)] min-[761px]:mb-[18px] min-[761px]:text-[clamp(15px,1.1vw,18px)] min-[761px]:leading-[1.5] ${wide ? 'max-w-full min-[761px]:max-w-[720px]' : 'max-w-full min-[761px]:max-w-[680px]'}`}
                    >
                        {paragraphSegments[1].map((segment, index) => (
                            <Fragment key={`${segment.text}-${index}`}>
                                {segment.strong ? <strong className="font-bold">{segment.text}</strong> : segment.text}
                            </Fragment>
                        ))}
                    </p>
                </div>
            ) : null}
            {/* Links: the demo and the occasion page, as pills on one row that wraps on phones */}
            {demo || more ? (
                <div className="mt-6 flex flex-wrap items-center gap-3 min-[761px]:mt-[clamp(20px,2vw,30px)]">
                    {/* Demo link */}
                    {demo ? (
                        <a
                            className={cn(
                                PILL,
                                'gap-3 bg-[linear-gradient(135deg,#d27b9b_0%,#e78274_28%,#f4905f_58%,#fcba63_100%)] text-white! shadow-[0_16px_32px_rgba(217,102,74,.15)]',
                            )}
                            href={demo.href}
                            {...landingClickAttributes({ event: 'demo', placement: 'stories' })}
                        >
                            <span>{demo.label}</span>
                            <span aria-hidden="true" className="text-[18px] leading-none">
                                ↗
                            </span>
                        </a>
                    ) : null}
                    {/* Occasion page link: sentence case so the longer label stays on one line on phones */}
                    {more ? (
                        <a
                            className={cn(
                                PILL,
                                'border border-[var(--ink)]/20 bg-white py-3 text-[13px] font-bold tracking-normal text-[var(--ink)] normal-case min-[761px]:py-[13px] min-[761px]:text-[13px] min-[761px]:tracking-normal',
                            )}
                            href={more.href}
                        >
                            {more.label}
                        </a>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
