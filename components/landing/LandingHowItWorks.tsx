import { getTranslations } from 'next-intl/server';

const STEP_ICONS = [
    // Create: a document with a plus
    <g key="create">
        <rect height="14" rx="2" width="16" x="4" y="5" />
        <path d="M12 9v6M9 12h6" />
    </g>,
    // Share: a scattered grid of tiles
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v4h-2zM14 18h4v2h-4z" key="share" />,
    // Story begins: a calendar/schedule
    <g key="story-begins">
        <rect height="14" rx="2" width="16" x="4" y="5" />
        <path d="M8 10h5M8 14h8M17 3v3M15.5 4.5h3" />
    </g>,
] as const;

export async function LandingHowItWorks() {
    const t = await getTranslations('LandingPage.howItWorks');
    const steps = t.raw('steps') as { description: string; title: string }[];

    return (
        <section
            aria-labelledby="how-it-works-title"
            className="bg-white px-5 py-[34px] pb-[38px] text-[#151313] min-[761px]:px-[clamp(28px,5.5vw,96px)] min-[761px]:py-[clamp(30px,3.2vw,48px)]"
            id="howItWorks"
        >
            <div className="mx-auto grid max-w-[1480px] min-[761px]:grid-cols-[1.12fr_1fr_1fr_1.12fr]">
                {/* Intro */}
                <div className="flex flex-col items-center justify-center text-center min-[761px]:relative min-[761px]:items-start min-[761px]:pr-[clamp(42px,4vw,72px)] min-[761px]:text-left min-[761px]:after:absolute min-[761px]:after:top-1/2 min-[761px]:after:right-[-8px] min-[761px]:after:-translate-y-1/2 min-[761px]:after:[font-family:var(--editorial)] min-[761px]:after:text-[clamp(62px,5.8vw,98px)] min-[761px]:after:leading-none min-[761px]:after:text-[rgba(222,127,131,0.14)] min-[761px]:after:content-['→']">
                    <p className="mb-3 text-[10px] font-extrabold tracking-[0.16em]" id="how-it-works-title">
                        {t('eyebrow')}
                    </p>
                    <h2 className="m-0 max-w-full bg-[linear-gradient(90deg,#f2c764_0%,#f29a62_48%,#df7794_100%)] bg-clip-text [font-family:var(--editorial)] text-[40px] leading-[0.95] font-normal tracking-[-0.045em] text-transparent min-[761px]:max-w-[370px] min-[761px]:text-[clamp(34px,3.15vw,51px)] min-[761px]:leading-[0.92]">
                        {t('headingStart')}
                        <br />
                        {t('headingEnd')}
                    </h2>
                </div>
                {/* Steps */}
                {steps.map((step, index) => (
                    <article
                        className={`mt-7 flex flex-col items-center justify-center text-center min-[761px]:mt-0 min-[761px]:items-start min-[761px]:border-l min-[761px]:border-[#151313]/[0.13] min-[761px]:px-[clamp(24px,2.3vw,38px)] min-[761px]:py-1 min-[761px]:text-left ${index === 0 ? 'min-[761px]:border-l-0 min-[761px]:pl-[clamp(34px,3vw,48px)]' : ''}`}
                        key={step.title}
                    >
                        <div className="mb-2.5 inline-flex items-center gap-2 min-[761px]:gap-[9px]">
                            <span className="bg-[linear-gradient(90deg,#f2c764_0%,#f09a62_55%,#df7794_100%)] bg-clip-text text-[12px] font-black tracking-[0.08em] text-transparent">
                                0{index + 1}
                            </span>
                            <svg
                                aria-hidden="true"
                                className="size-5 fill-none stroke-[rgba(220,121,134,0.72)] stroke-[1.35] min-[761px]:size-[21px]"
                                viewBox="0 0 24 24"
                            >
                                {STEP_ICONS[index]}
                            </svg>
                        </div>
                        <h3 className="m-0 [font-family:var(--editorial)] text-[31px] leading-[0.98] font-normal tracking-[-0.03em] min-[761px]:text-[clamp(27px,2vw,34px)]">
                            {step.title}
                        </h3>
                        <p className="mt-2.5 max-w-full text-[17px] leading-[1.5] min-[761px]:mt-[10px] min-[761px]:max-w-[330px] min-[761px]:text-[15px] min-[761px]:leading-[1.45]">
                            {step.description}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
}
