import { getTranslations } from 'next-intl/server';

import { INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
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
                <ol className="m-0 grid list-none gap-9 p-0 min-[761px]:grid-cols-3 min-[761px]:gap-10">
                    {steps.map((step, index) => (
                        <li key={step.title}>
                            <p aria-hidden="true" className={`m-0 [font-family:var(--editorial)] text-5xl leading-none ${GRADIENT_TEXT}`}>
                                {String(index + 1).padStart(2, '0')}
                            </p>
                            <h3 className="m-0 mt-4 text-lg font-bold">{step.title}</h3>
                            <p className={`${FEATURE_BODY} text-[#151313]/75`}>{step.body}</p>
                        </li>
                    ))}
                </ol>
                <p className="m-0 mt-10 text-sm text-[#151313]/65">{t('planNote')}</p>
            </div>
        </section>
    );
}
