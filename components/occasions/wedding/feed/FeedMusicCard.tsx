import { ArrowRight } from 'lucide-react';
import { Fragment } from 'react';
import { PiMusicNotesPlusFill } from 'react-icons/pi';

import type { WeddingFeedMusic } from '@/lib/occasions/weddingCopy';

// The playlist update between posts, drawn like the app's playlist digest card.
export function FeedMusicCard({ copy }: { copy: WeddingFeedMusic }) {
    return (
        <div className="border-t border-[#151313]/8 px-[2.6cqw] py-[3cqw]">
            <div className="relative isolate overflow-hidden rounded-[4cqw] bg-[linear-gradient(135deg,#9d3868_0%,#ff7a59_55%,#ffb259_100%)] px-[4.4cqw] py-[4cqw] text-white">
                <span className="absolute inset-y-0 right-0 -z-10 w-1/2 bg-white/10 [clip-path:polygon(24%_0,100%_0,100%_100%,0_100%)]" />
                <PiMusicNotesPlusFill className="absolute top-1/2 left-1/2 -z-10 size-[28cqw] -translate-x-1/2 -translate-y-1/2 text-white/10" />
                {/* Date, month, time */}
                <div className="flex items-end gap-[2cqw]">
                    {copy.labels.map((label, index) => (
                        <Fragment key={label}>
                            {index > 0 ? <span className="mb-[0.4cqw] h-[7cqw] w-px bg-white/80" /> : null}
                            <span>
                                <span className="block text-[2.6cqw] leading-none font-semibold text-white/75 uppercase">{label}</span>
                                <span className="mt-[0.8cqw] block text-[4.6cqw] leading-none font-black tabular-nums">{copy.values[index]}</span>
                            </span>
                        </Fragment>
                    ))}
                </div>
                {/* Title */}
                <div className="mt-[4cqw] grid grid-cols-[1fr_auto] items-center gap-[3cqw]">
                    <div className="min-w-0">
                        <p className="m-0 text-[2.8cqw] font-medium text-white/80 uppercase">{copy.kicker}</p>
                        <p className="m-0 mt-[1.4cqw] text-[4.6cqw] leading-tight font-semibold">{copy.title}</p>
                        <p className="m-0 mt-[1.4cqw] text-[2.8cqw] text-white/75">{copy.time}</p>
                    </div>
                    <PiMusicNotesPlusFill className="size-[19cqw] text-white/90" />
                </div>
                {/* Open playlist */}
                <div className="mt-[3cqw] flex justify-end">
                    <span className="inline-flex items-center gap-[1.6cqw] rounded-full border border-white/30 bg-white/15 px-[3.4cqw] py-[1.6cqw] text-[3cqw] font-semibold">
                        <PiMusicNotesPlusFill className="size-[3.6cqw]" />
                        {copy.cta}
                        <ArrowRight className="size-[3.2cqw]" strokeWidth={2} />
                    </span>
                </div>
            </div>
        </div>
    );
}
