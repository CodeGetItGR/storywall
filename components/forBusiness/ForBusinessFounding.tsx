import { getTranslations } from 'next-intl/server';

import { BODY, H2, INNER, PRIMARY_BUTTON, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { FoundingBlock } from '@/lib/forBusiness';

export async function ForBusinessFounding({ block }: { block: Exclude<FoundingBlock, { kind: 'hidden' }> }) {
    const t = await getTranslations('ForBusinessPage.founding');
    const apply = await getTranslations('ForBusinessPage.hero');

    return (
        /* Founding partners */
        <section className={`${SECTION} bg-[#f4f0e8]`}>
            <div className={INNER}>
                <h2 className={H2}>{t('heading')}</h2>
                <p className="mt-5 text-2xl font-semibold">
                    {block.kind === 'count' ? t('spotsLeft', { left: block.left, total: block.total }) : t('limited', { total: block.total })}
                </p>
                <p className={`mt-3 max-w-[56ch] ${BODY}`}>{t('body')}</p>
                <p className={`mt-2 max-w-[56ch] ${BODY}`}>{t('freeEvent')}</p>
                <a href="#apply" className={`mt-7 ${PRIMARY_BUTTON}`}>
                    {apply('apply')}
                </a>
            </div>
        </section>
    );
}
