import { getTranslations } from 'next-intl/server';

import { INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { STEP_ART } from '@/components/vendorPages/art/stepArt';
import { VendorPageArt } from '@/components/vendorPages/art/VendorPageArt';
import { BAND, FEATURE_BODY, GRADIENT_TEXT } from '@/components/vendorPages/vendorPageStyles';
import { VendorSectionHead } from '@/components/vendorPages/VendorSectionHead';

type Step = { title: string; body: string };

export async function VendorPageSteps() {
    const t = await getTranslations('VendorPages');
    const steps = t.raw('steps') as Step[];

    return (
        /* How you start */
        <section className={`${SECTION} pt-0! min-[761px]:pt-0!`}>
            <div className={`${INNER} ${BAND} bg-white`}>
                <VendorSectionHead eyebrow={t('sections.steps.eyebrow')} grad={t('sections.steps.grad')} plain={t('sections.steps.plain')} />
                <ol className="m-0 grid list-none gap-7 p-0 min-[761px]:grid-cols-3 min-[761px]:gap-10">
                    {steps.map((step, index) => (
                        <li key={step.title} className="flex gap-4 min-[761px]:block">
                            <VendorPageArt art={STEP_ART[index]!} />
                            <div className="min-w-0">
                                <h3 className="m-0 flex items-baseline gap-2 text-lg font-bold min-[761px]:mt-4">
                                    <span
                                        aria-hidden="true"
                                        className={`[font-family:var(--editorial)] text-2xl leading-none font-normal ${GRADIENT_TEXT}`}
                                    >
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    {step.title}
                                </h3>
                                <p className={`${FEATURE_BODY} text-[#151313]/75`}>{step.body}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
