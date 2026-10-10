import { getTranslations } from 'next-intl/server';

import { BODY, H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';

export async function ForBusinessDestination() {
    const t = await getTranslations('ForBusinessPage.destination');

    return (
        /* Destination weddings */
        <section className={`${SECTION} bg-[#151313] text-white`}>
            <div className={INNER}>
                <h2 className={H2}>{t('heading')}</h2>
                <p className={`mt-5 max-w-[56ch] ${BODY} text-white/80`}>{t('body')}</p>
            </div>
        </section>
    );
}
