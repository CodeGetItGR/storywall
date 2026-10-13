import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { OccasionCtaLink } from '@/components/occasions/OccasionCtaLink';
import { OccasionSectionHeading } from '@/components/occasions/OccasionSectionHeading';
import type { Locale } from '@/i18n/config';
import type { ThemePresetDto } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';
import { resolveLocalizedText } from '@/lib/localizedText';
import type { Occasion } from '@/lib/occasions/occasions';

type OccasionThemesProps = { createHref: string; locale: Locale; occasion: Occasion; presets: ThemePresetDto[] };

export async function OccasionThemes({ createHref, locale, occasion, presets }: OccasionThemesProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.themes` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });

    return (
        <section className="bg-[var(--occasion-tint)] px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            {/* Heading */}
            <OccasionSectionHeading eyebrow={t('eyebrow')}>{t('heading')}</OccasionSectionHeading>

            {/* Themes */}
            <ul className="mt-8 grid list-none grid-cols-2 gap-3 p-0 min-[600px]:grid-cols-3 min-[761px]:mt-10 min-[761px]:gap-4 min-[1100px]:grid-cols-6">
                {presets.map((preset) => (
                    <li className="rounded-2xl border border-[var(--occasion-line)] bg-white p-1.5" key={preset.id}>
                        <div
                            className="relative aspect-square overflow-hidden rounded-xl bg-[var(--occasion-tint)]"
                            style={isHexColor(preset.backgroundColor) ? { backgroundColor: preset.backgroundColor } : undefined}
                        >
                            <Image
                                fill
                                alt=""
                                className="object-contain"
                                sizes="(min-width: 1100px) 15vw, (min-width: 600px) 30vw, 45vw"
                                src={preset.illustrationUrl}
                            />
                        </div>
                        <p className="m-0 px-2 py-2.5 text-center text-sm">{resolveLocalizedText(preset.name, locale)}</p>
                    </li>
                ))}
            </ul>

            {/* Create */}
            <div className="mt-10 flex justify-center">
                <OccasionCtaLink href={createHref}>{common('finalCta')}</OccasionCtaLink>
            </div>
        </section>
    );
}
