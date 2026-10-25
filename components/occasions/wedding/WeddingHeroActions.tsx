import { landingClickAttributes } from '@/lib/landingTracking';
import { splitInTwoLines } from '@/lib/occasions/weddingCopy';

const CREATE =
    'focus-ring inline-flex min-h-14.5 items-center gap-3 rounded-full bg-[linear-gradient(100deg,#ff6f93_0%,#ff936a_52%,#ffd05b_100%)] py-1.75 pr-2 pl-5 [font-family:var(--editorial)] text-[16px] leading-[1.05] text-white no-underline shadow-[0_18px_38px_-16px_rgba(255,111,147,0.55)] transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4 motion-reduce:transition-none min-[768px]:min-h-18.5 min-[768px]:gap-4 min-[768px]:py-2.5 min-[768px]:pr-2.75 min-[768px]:pl-7 min-[768px]:text-[19px]';
const CREATE_ARROW =
    'grid size-11 shrink-0 place-items-center rounded-full bg-white font-[Arial,Helvetica,sans-serif] text-[24px] font-extralight text-[#ef9772] min-[768px]:size-13.5 min-[768px]:text-[30px]';
const DEMO =
    'focus-ring inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#151313] uppercase no-underline focus-visible:outline-offset-4 min-[768px]:gap-3 min-[768px]:text-[11px]';
const DEMO_ARROW = 'grid size-9 shrink-0 place-items-center rounded-full border border-[#151313] text-[16px] min-[768px]:size-10.5';

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
                <span aria-hidden="true" className={CREATE_ARROW}>
                    ↗
                </span>
            </a>
            {/* Demo */}
            {demoHref ? (
                <a className={DEMO} href={demoHref} {...landingClickAttributes({ event: 'demo', placement: 'hero' })}>
                    {demoLabel}
                    <span aria-hidden="true" className={DEMO_ARROW}>
                        ↗
                    </span>
                </a>
            ) : null}
        </div>
    );
}
