import { landingClickAttributes } from '@/lib/landingTracking';
import { splitInTwoLines } from '@/lib/occasions/weddingCopy';

const CREATE =
    'focus-ring inline-flex min-h-14.5 items-center rounded-full bg-[linear-gradient(100deg,#ff6f93_0%,#ff936a_52%,#ffd05b_100%)] px-6 py-2 [font-family:var(--editorial)] text-[16px] leading-[1.05] text-white no-underline shadow-[0_18px_38px_-16px_rgba(255,111,147,0.55)] transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4 motion-reduce:transition-none min-[768px]:min-h-18.5 min-[768px]:px-8 min-[768px]:py-2.5 min-[768px]:text-[19px]';
const DEMO =
    'focus-ring inline-flex min-h-11 items-center text-[10px] font-extrabold tracking-[0.12em] text-[#151313] uppercase no-underline focus-visible:outline-offset-4 min-[768px]:text-[11px]';

type WeddingHeroActionsProps = {
    createHref: string;
    createLabel: string;
    // null: the wedding demo is off, so there is no demo link.
    demoHref: string | null;
    demoLabel: string;
};

// The hero's gradient create button and the demo link.
export function WeddingHeroActions({ createHref, createLabel, demoHref, demoLabel }: WeddingHeroActionsProps) {
    const [firstLine, secondLine] = splitInTwoLines(createLabel);

    return (
        <div className="mt-6 flex flex-wrap items-center gap-[15px] min-[768px]:mt-7.5 min-[768px]:gap-x-5.5 min-[768px]:gap-y-3.5">
            {/* Create */}
            <a className={CREATE} href={createHref} {...landingClickAttributes({ event: 'create', placement: 'hero' })}>
                {/* Two lines, as in the design; the box hugs the longer one */}
                <span>
                    {secondLine ? (
                        <>
                            {firstLine} <br />
                            {secondLine}
                        </>
                    ) : (
                        firstLine
                    )}
                </span>
            </a>
            {/* Demo */}
            {demoHref ? (
                <a className={DEMO} href={demoHref} {...landingClickAttributes({ event: 'demo', placement: 'hero' })}>
                    {demoLabel}
                </a>
            ) : null}
        </div>
    );
}
