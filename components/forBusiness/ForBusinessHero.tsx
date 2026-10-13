import { getTranslations } from 'next-intl/server';

import { BODY, PRIMARY_BUTTON, SECONDARY_LINK } from '@/components/forBusiness/forBusinessStyles';
import { routes } from '@/lib/routes';

export async function ForBusinessHero() {
    const t = await getTranslations('ForBusinessPage.hero');

    return (
        /* Hero */
        <section className="px-5 pt-8 pb-14 min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-14 min-[761px]:pb-22">
            <div className="mx-auto w-full max-w-295">
                <h1 className="m-0 max-w-[16ch] [font-family:var(--editorial)] text-[48px] leading-[0.92] font-normal tracking-[-0.055em] min-[761px]:text-[clamp(64px,7vw,112px)]">
                    {t('title')}
                </h1>
                <p className={`mt-5 max-w-[52ch] ${BODY}`}>{t('lead')}</p>
                {/* Actions */}
                <div className="mt-7 flex flex-wrap items-center gap-5">
                    <a href="#apply" className={PRIMARY_BUTTON}>
                        {t('apply')}
                    </a>
                    <a href={routes.demo} className={SECONDARY_LINK}>
                        {t('demo')}
                    </a>
                </div>
            </div>
        </section>
    );
}
