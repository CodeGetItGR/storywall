import { getTranslations } from 'next-intl/server';

import { H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';

const ROLES = ['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC'] as const;

export async function ForBusinessRoles() {
    const t = await getTranslations('ForBusinessPage.roles');

    return (
        /* Who it's for */
        <section className={`${SECTION} bg-[#f4f0e8]`}>
            <div className={INNER}>
                <h2 className={H2}>{t('heading')}</h2>
                <ul className="mt-8 flex list-none flex-wrap gap-3 p-0">
                    {ROLES.map((role) => (
                        <li key={role} className="rounded-full bg-white px-4 py-2 text-sm font-semibold">
                            {t(`items.${role}`)}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
