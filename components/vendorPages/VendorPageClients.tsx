import { UserRoundCheck, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { GradientIcon } from '@/components/vendorPages/GradientIcon';
import { CLIENT_ICONS } from '@/components/vendorPages/vendorPageIcons';
import { VendorSectionHead } from '@/components/vendorPages/VendorSectionHead';
import { VENDOR_CLIENT_PHASES, VENDOR_STRIP } from '@/lib/vendorPages';

type Row = { title: string; body: string };

const GROUPS = [
    { key: 'host', heading: 'hosts', icon: UserRoundCheck },
    { key: 'guest', heading: 'guests', icon: Users },
] as const;

export async function VendorPageClients() {
    const t = await getTranslations('VendorPages');

    return (
        /* What your clients get */
        <section className={`${SECTION} pt-0! min-[761px]:pt-0!`}>
            <div className={INNER}>
                <VendorSectionHead eyebrow={t('sections.clients.eyebrow')} grad={t('sections.clients.grad')} plain={t('sections.clients.plain')} />
                {/* Hosts and guests */}
                <div className="grid gap-12 min-[761px]:grid-cols-2 min-[761px]:gap-16">
                    {GROUPS.map((group) => (
                        <div key={group.key} className="min-w-0">
                            <h3 className="m-0 flex items-center gap-3 [font-family:var(--editorial)] text-3xl font-normal tracking-[-0.03em]">
                                <GradientIcon icon={group.icon} />
                                {t(`clients.${group.heading}`)}
                            </h3>
                            {VENDOR_CLIENT_PHASES.map((phase) => (
                                <div key={phase} className="mt-7">
                                    <p className="m-0 mb-3 text-xs font-black tracking-[.15em] text-[#d87d8f] uppercase">{t(`clients.phases.${phase}`)}</p>
                                    <ul className="m-0 list-none divide-y divide-[#151313]/10 p-0">
                                        {(t.raw(`clients.${group.key}.${phase}`) as Row[]).map((row, index) => (
                                            <li key={row.title} className="flex gap-4 py-3.5">
                                                <GradientIcon icon={CLIENT_ICONS[group.key][phase][index]!} className="mt-0.5 size-5" />
                                                <div className="min-w-0">
                                                    <h4 className="m-0 text-[15px] font-bold">{row.title}</h4>
                                                    <p className="m-0 mt-1 text-sm leading-[1.5] text-[#151313]/70">{row.body}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                {/* Photos */}
                <div className="mt-14 grid grid-cols-2 gap-4 min-[761px]:grid-cols-4 min-[761px]:gap-5">
                    {VENDOR_STRIP.map((photo) => (
                        <figure key={photo.key} className="m-0">
                            <ProtectedImage
                                alt={t(`strip.${photo.key}.alt`)}
                                className="aspect-[3/4] w-full rounded-[22px] object-cover"
                                height={640}
                                sizes="(min-width: 761px) 25vw, 50vw"
                                src={photo.src}
                                width={480}
                            />
                            <figcaption className="mt-3 text-sm text-[#151313]/70">{t(`strip.${photo.key}.caption`)}</figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}
