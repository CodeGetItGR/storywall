import { getTranslations } from 'next-intl/server';

import { BODY, H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';

export async function ForBusinessSteps() {
    const t = await getTranslations('ForBusinessPage.steps');
    const items = t.raw('items') as string[];

    return (
        /* How it works */
        <section className={SECTION}>
            <div className={INNER}>
                <h2 className={H2}>{t('heading')}</h2>
                <ol className="mt-8 grid list-none gap-5 p-0 min-[761px]:grid-cols-4">
                    {items.map((item, index) => (
                        <li key={item} className={BODY}>
                            <span className="mb-2 block [font-family:var(--editorial)] text-3xl text-[#d87d8f]">{index + 1}</span>
                            {item}
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
